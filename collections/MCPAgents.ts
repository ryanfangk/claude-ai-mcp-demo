import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { isAdmin } from './access'
import { deriveAgentEmail, slugForAgentEmail } from '@/lib/mcp-agent-email'

// Server-side id + email derivation: a manual create that omits `email` gets
// one computed from the row's `name` + `id`. With UUID PKs, we pre-assign the
// id here so the email can derive from it (the DB accepts the supplied UUID
// as the row's primary key). The OAuth provisioning path in lib/workos.ts
// uses the same shape for symmetry.
const deriveAgentEmailHook: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (!data) return data
  if (operation === 'create' && !data.id) {
    data.id = crypto.randomUUID()
  }
  if (!data.email && typeof data.name === 'string' && data.name.trim() && typeof data.id === 'string') {
    data.email = deriveAgentEmail(data.name, data.id)
  }
  return data
}

// Identity directory for programmatic MCP agents.
//
// The official `@payloadcms/plugin-mcp` backs each API key with a row from a
// `userCollection` (set in payload.config.ts). Pointing that at `mcp-agents`
// instead of `admins` is what makes attribution correct: writes from the MCP
// surface are made by an `mcp-agents` row, not by a human admin, so access
// checks for `collection === 'admins'` reject the agent on critical surfaces
// even if a tool were exposed.
//
// Agents do NOT log in. This is auth-enabled (so Payload treats the row as a
// principal and the plugin's API-key UI is generated on it), but
// `disableLocalStrategy` removes email/password — agents only authenticate
// via the plugin's API key OR via WorkOS-issued OAuth bearer tokens (see
// lib/workos.ts). Revoke an agent by deleting its API key(s), untick the
// `active` checkbox to revoke an OAuth-provisioned agent, or delete the row.
export const MCPAgents: CollectionConfig = {
  slug: 'mcp-agents',
  auth: { disableLocalStrategy: true },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'id', 'workosUserId', 'active', 'lastSeenAt'],
    description:
      'Identity for programmatic MCP agents. Static API keys link via "MCP API Keys"; WorkOS-OAuth agents (Claude.ai) are auto-created here on first connect. Untick "active" to revoke an OAuth agent.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [deriveAgentEmailHook],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      // Google-Cloud-style account-id rules, enforced at INPUT: a name with a
      // space / uppercase / underscore is REJECTED outright, not silently
      // slugified after the fact. Reuses the SINGLE shared slug rule (lib/
      // mcp-agent-email) so the name rule and the derived-email rule can't
      // drift. The OAuth auto-created name is built with the same function
      // and always passes.
      validate: (val: unknown) => {
        if (typeof val !== 'string' || !val) return 'Name is required.'
        if (slugForAgentEmail(val) !== val) {
          return `Name must be a lowercase slug — letters, digits and single hyphens, starting with a letter, 32 characters max, no spaces or uppercase. Suggested: "${slugForAgentEmail(val)}".`
        }
        return true
      },
      admin: {
        description:
          'The agent identifier you choose, e.g. "content-bot". Lowercase letters/digits/hyphens only, must start with a letter, no spaces, max 32 characters. Must be unique. The email is derived from this.',
      },
    },
    {
      name: 'email',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      // Server-side derived by deriveAgentEmailHook (beforeValidate) so the
      // value is legitimately empty in the client form until save. A custom
      // validate that returns `true` suppresses Payload's default "required"
      // check on submit; presence stays guaranteed by the hook + the DB NOT
      // NULL column.
      validate: (): true => true,
      admin: {
        readOnly: true,
        description:
          'Generated address `<name-slug>-<id-prefix>@MCP_AGENT_EMAIL_DOMAIN` — readable from the name, unique via the row id (UUID) prefix. Defaults to the placeholder domain `agents.local` if MCP_AGENT_EMAIL_DOMAIN is unset.',
      },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'workosUserId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'The WorkOS AuthKit user id (the OAuth token `sub`) this agent is linked to. Captured automatically on first OAuth connect. Stable identity — matching keys on this, not the mutable email. Null for static-API-key agents.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'MCP access switch for the WorkOS-OAuth path. Default ON — a connecting WorkOS user is granted access automatically. Untick to REVOKE (e.g. a compromised account); a revoked identity is denied at its next connect. (Static-API-key agents are revoked by deleting their key instead.)',
      },
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Last successful MCP connection by this agent (auto-updated on each connect).',
      },
    },
  ],
}
