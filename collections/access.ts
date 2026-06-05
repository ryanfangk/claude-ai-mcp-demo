import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'

// MCP agents are a first-class identity (`mcp-agents`), backed by the plugin's
// API keys via `userCollection`. These two grant the agent the same content
// reach a human admin has, but ONLY on collections that opt in.
export const isAdminOrMcpAgent: Access = ({ req }) =>
  req.user?.collection === 'admins' || req.user?.collection === 'mcp-agents'

// Customer-storefront identity. Used to scope row-level access on Users +
// Purchases — a logged-in shopper can only see their own row, never anyone
// else's. Admins always pass.
export const isAdminOrSelf: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection === 'users') {
    return { id: { equals: req.user.id } }
  }
  return false
}

// Read access for purchases — admins see everything, customers see their own
// (a query filter, NOT an early-return true, so list views stay scoped).
export const ownPurchasesOrAdmin: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection === 'users') {
    return { user: { equals: req.user.id } }
  }
  return false
}
