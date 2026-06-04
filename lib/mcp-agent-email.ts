// Pure slug + email derivation for MCP agents. Shared by the server (the
// MCPAgents beforeValidate hook + the WorkOS-OAuth provisioning path) so the
// slug rule can't drift between manual creates and OAuth auto-provisions.
//
// `slugForAgentEmail` is env-free and side-effect-free (client-safe).
// `deriveAgentEmail` reads the server-only MCP_AGENT_EMAIL_DOMAIN.

// Google-Cloud-/RFC-safe local-part slug: lowercase, [a-z0-9-], must start with
// a letter, no leading/trailing or doubled hyphens, length-capped.
//
// Cap rationale: this slug becomes the email local-part
// `<slug>-<id[:8]>@domain`. RFC 5321 caps a local-part at 64; the
// `-<id[:8]>` suffix is 9 chars → slug ceiling 55. We cap at 32: it fits
// the longest derived name EXACTLY — the OAuth agent name
// `oauth-<26-char WorkOS ULID>` = 32 — so the full WorkOS id survives uncut
// (stays unique) and manual names stay short/readable.
const SLUG_MAX = 32
export function slugForAgentEmail(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alnum runs → single hyphen
    .replace(/-+/g, '-')
    .replace(/^[^a-z]+/, '') // local-part must start with a letter
    .replace(/-+$/, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
  return s || 'agent'
}

// Placeholder domain until a verified sending domain is configured via
// MCP_AGENT_EMAIL_DOMAIN.
export const AGENT_EMAIL_DOMAIN_FALLBACK = 'agents.local'

// The agent's address: `<name-slug>-<id segment>@<domain>`. Readable from
// the name, UNIQUE by the id segment (the row's UUID primary key).
export function deriveAgentEmail(name: string, id: string): string {
  const domain = process.env.MCP_AGENT_EMAIL_DOMAIN || AGENT_EMAIL_DOMAIN_FALLBACK
  return `${slugForAgentEmail(name)}-${id.slice(0, 8)}@${domain}`
}
