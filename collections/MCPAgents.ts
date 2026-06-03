import type { CollectionConfig } from 'payload'
import { isAdmin } from './access'

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
// `disableLocalStrategy` removes email/password — agents only authenticate via
// the plugin's API key. Revoke an agent by deleting its API key(s) and/or row.
export const MCPAgents: CollectionConfig = {
  slug: 'mcp-agents',
  auth: { disableLocalStrategy: true },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'active'],
    description:
      'Identity for programmatic MCP agents. Create one per consumer (e.g. "content-bot"), then mint API keys for it under "MCP API Keys".',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'A unique handle for this agent, e.g. "content-bot".' },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Untick to revoke this agent (denied at next connect).' },
    },
  ],
}
