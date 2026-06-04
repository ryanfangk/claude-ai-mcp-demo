import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { PayloadRequest, TypedUser } from 'payload'
import type { MCPAccessSettings } from '@payloadcms/plugin-mcp'
import { deriveAgentEmail, slugForAgentEmail } from '@/lib/mcp-agent-email'

// WorkOS AuthKit is the OAuth 2.1 authorization server used to connect this
// MCP server (the resource server) to Claude.ai web — which requires an OAuth
// flow with user consent, not a pasted bearer token. AuthKit issues an
// audience-bound JWT; this module validates it against the AuthKit JWKS.
//
// References (verified at implementation time):
//   - WorkOS AuthKit MCP guide: https://workos.com/docs/authkit/mcp
//       (JWKS at `${domain}/oauth2/jwks`, issuer = AuthKit domain,
//        audience = the MCP server URL / RFC 8707 Resource Indicator)
//   - MCP Authorization spec (2025-11-25): the resource server MUST validate
//     that the token's audience is itself.

// Normalize a URL-shaped env var: prepend https:// if the value is a bare
// host, strip any trailing slash. Returns null when the env var is unset.
//
// Why a normalizer: the Vercel dashboard's UI nudges operators to paste
// hostnames without a scheme; without normalization the value flows straight
// into `new URL(...)` (which throws), into a fetch() (which throws), and into
// the JSON metadata responses (which Claude.ai parses as a bare host and
// can't route to). Centralizing the rule keeps the three call sites
// (JWKS fetch, AS metadata proxy, PRM document) in sync.
export function normalizeUrlEnv(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/$/, '')
}

const authkitDomain = normalizeUrlEnv(process.env.WORKOS_AUTHKIT_DOMAIN)
export { authkitDomain as workosAuthkitDomain }

// The MCP server's resource identifier (RFC 8707 audience). MUST match the
// Resource Indicator registered in the WorkOS Dashboard. Derived from the site
// URL so each environment (localhost in dev, the deployed URL in prod) binds
// to its own resource.
export const mcpResourceUrl = `${normalizeUrlEnv(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000'}/api/mcp`

export const protectedResourceMetadataPath = '/.well-known/oauth-protected-resource'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!authkitDomain) return null
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${authkitDomain}/oauth2/jwks`))
  return jwks
}

export const workosConfigured = Boolean(authkitDomain)

// Validate a WorkOS AuthKit access token for this MCP server. Returns the
// verified claims, or null if WorkOS isn't configured or the token is invalid
// (wrong signature / issuer / audience / expired).
export async function verifyWorkosMcpToken(token: string) {
  const keyset = getJwks()
  if (!keyset || !authkitDomain) return null
  try {
    const { payload } = await jwtVerify(token, keyset, {
      issuer: authkitDomain,
      audience: mcpResourceUrl,
    })
    return payload
  } catch {
    return null
  }
}

// Deterministic, UNIQUE agent name from the WorkOS subject, built with the
// SAME shared slug rule the mcp-agents `name` validation uses — so an
// OAuth-created name always passes (no parallel slug logic to drift).
//
// We strip the `user_` prefix and keep the whole 26-char ULID — NOT a
// truncated prefix. (A `workosUserId.slice(0, 8)` produces the same
// `user_01k...` for every WorkOS user, because the leading ULID chars are
// timestamp high-bits shared across all users for years — every first connect
// would then collide on the unique `name`.) `oauth-` (6) + the 26-char ULID =
// 32 chars, exactly slugForAgentEmail's cap, so the full high-entropy id
// survives uncut → unique per subject.
export function oauthAgentName(workosUserId: string): string {
  return slugForAgentEmail(`oauth-${workosUserId.replace(/^user_/, '')}`)
}

// Resolve a WorkOS-authenticated principal to an `mcp-agents` row so the
// audit trail attributes writes to a stable agent. Matches on `workosUserId`
// (the token `sub`) — the stable linked credential, never the mutable email.
//
// Access model = DEFAULT-ALLOW: an unrecognized WorkOS user is auto-created
// as an active agent on first connect. Revocation is the manual action —
// an admin unticks `active`, and the identity is denied at its next connect.
// Returns null when access is denied (revoked, or no stable subject).
export async function resolveOAuthAgent(
  req: PayloadRequest,
  claims: { sub?: unknown },
): Promise<TypedUser | null> {
  const workosUserId = typeof claims.sub === 'string' && claims.sub ? claims.sub : null
  if (!workosUserId) return null
  const now = new Date().toISOString()

  const findByWorkosId = async () =>
    (
      await req.payload.find({
        collection: 'mcp-agents',
        where: { workosUserId: { equals: workosUserId } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]

  let agent = await findByWorkosId()

  if (!agent) {
    const name = oauthAgentName(workosUserId)
    const id = crypto.randomUUID()
    try {
      agent = await req.payload.create({
        collection: 'mcp-agents',
        data: {
          id,
          name,
          email: deriveAgentEmail(name, id),
          workosUserId,
          active: true,
          lastSeenAt: now,
        },
        overrideAccess: true,
      })
    } catch (err) {
      // A concurrent connect created the agent between our find and create —
      // the unique constraint on `workosUserId` / `name` rejects the loser.
      // Re-fetch the winner instead of surfacing "Value must be unique".
      agent = await findByWorkosId()
      if (!agent) throw err
    }
  }

  if (agent.active === false) return null // explicitly revoked → deny

  agent = await req.payload.update({
    collection: 'mcp-agents',
    id: agent.id,
    data: { lastSeenAt: now },
    overrideAccess: true,
  })
  return { ...agent, collection: 'mcp-agents' } as unknown as TypedUser
}

// `overrideAuth` for @payloadcms/plugin-mcp. Tries WorkOS AuthKit OAuth first
// (the Claude.ai-web path): a valid AuthKit JWT grants the content surface,
// attributed to an mcp-agent. Otherwise it defers to the plugin's default
// per-API-key auth (the Claude Code / mcp-remote path) — so both clients work.
export const mcpOverrideAuth = async (
  req: PayloadRequest,
  getDefaultMcpAccessSettings: (overrideApiKey?: null | string) => Promise<MCPAccessSettings>,
): Promise<MCPAccessSettings> => {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token && workosConfigured) {
    const claims = await verifyWorkosMcpToken(token)
    if (claims) {
      const user = await resolveOAuthAgent(req, claims)
      if (user) {
        // Attach the resolved principal to the request. The plugin only
        // threads the user to its generated tools via mcpAccessSettings.user
        // and never sets req.user — so custom tool handlers (and any
        // req.user-reading hook) would otherwise see no user. Set it here so
        // req is self-consistent for both auth paths.
        req.user = user
        return {
          user,
          products: { find: true, create: true, update: true },
          'payload-mcp-tool': {
            createManyProducts: true,
            updateManyProducts: true,
          },
        } as MCPAccessSettings
      }
      // resolveOAuthAgent returned null → revoked or unidentifiable; fall
      // through to default auth (which grants no content surface to a
      // WorkOS-only request that carries no API key).
    }
  }
  // Default per-API-key path. getDefaultMcpAccessSettings resolves the agent
  // from the API key but, like the OAuth branch above, does not set req.user —
  // do it here so custom tool handlers can attribute writes to the agent.
  const settings = await getDefaultMcpAccessSettings()
  if (settings?.user) req.user = settings.user as typeof req.user
  return settings
}
