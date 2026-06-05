import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf } from './access'

// Storefront shopper identity. Distinct from Admins (panel operators) and
// MCPAgents (programmatic identities) — three principal classes, each with
// its own collection so attribution is unambiguous.
//
// Auth-enabled with Payload's local strategy (email + password). The
// forgot-password / reset-password / verify endpoints all light up
// automatically once the collection is registered.
//
// Access posture:
// - Read: a shopper sees only their own row; admins see all.
// - Update: shopper edits own profile; admins do anything.
// - Create: open (the storefront register form hits this).
// - Delete: admins only (and even then, soft-delete via `trash: true` —
//   purchase history needs the user row to keep existing for
//   "purchased by ..." references).
//
// **MCP agents have no access** — neither read nor write, enforced both by
// the access functions below (the role check fails) and by the rule in
// .claude/rules/payload-conventions.md ("MCP access surface — content only,
// never identity or finance").
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Customer-friendly expiry: 7 days. Renewed on every authenticated
    // request via Payload's rolling token.
    tokenExpiration: 60 * 60 * 24 * 7,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  trash: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'createdAt'],
    description:
      'Customer-storefront identities. Created via the public /register form. NOT touchable by MCP — identity surface.',
  },
  access: {
    read: isAdminOrSelf,
    create: () => true, // anyone can register
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: {
        description: 'Display name shown on the profile page.',
      },
      validate: (val: unknown) => {
        if (val === undefined || val === null || val === '') return true
        if (typeof val !== 'string') return 'Name must be a string.'
        if (val.length > 80) return 'Name must be 80 characters or fewer.'
        return true
      },
    },
  ],
}
