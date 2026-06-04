import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'

// MCP agents are a first-class identity (`mcp-agents`), backed by the plugin's
// API keys via `userCollection`. These two grant the agent the same content
// reach a human admin has, but ONLY on collections that opt in.
export const isAdminOrMcpAgent: Access = ({ req }) =>
  req.user?.collection === 'admins' || req.user?.collection === 'mcp-agents'
