import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { isAdmin, ownPurchasesOrAdmin } from './access'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/categories'

// Mock-checkout order history. Every successful checkout creates one of these.
//
// **Price is snapshot at purchase time** (`priceAtPaid`, `currency`) — copying
// the product's current price rather than joining to it at read time. Products
// can change price after a purchase, and the line-item value MUST stay frozen
// at what the customer actually paid. Same reason `categoryAtPaid` snapshots
// the product's category — operator reporting on "what did we sell?" should
// reflect the row's state at sale time, not its eventual state.
//
// **MCP agents have no access** — financial-shape data, enforced by the
// access functions below + the rule in .claude/rules/payload-conventions.md.
//
// Foreign key on `product` is `ON DELETE RESTRICT` (configured in the
// migration) so a product with sales can never be hard-deleted from under a
// customer's history. Soft-delete via `trash: true` on Products is the right
// retirement path.
//
// No update or delete by the customer — purchases are append-only for the
// shopper. Admins can override (refund-shape semantics out of scope for this
// demo, but the access path is there).

const snapshotProductFields: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  // Snapshot price + category + currency from the linked product at create
  // time. Reading at create avoids the operator-facing "the product was X
  // when I bought it, why does my receipt show Y?" surprise.
  if (operation !== 'create' || !data?.product || data.priceAtPaid != null) {
    return data
  }
  const productId = typeof data.product === 'string' ? data.product : (data.product as { id?: string })?.id
  if (!productId) return data
  const p = await req.payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    overrideAccess: true,
  })
  if (!p) return data
  return {
    ...data,
    priceAtPaid: typeof p.price === 'number' ? p.price : 0,
    currency: typeof p.currency === 'string' ? p.currency : 'usd',
    categoryAtPaid: typeof p.category === 'string' ? p.category : null,
    purchasedAt: data.purchasedAt ?? new Date().toISOString(),
  }
}

export const Purchases: CollectionConfig = {
  slug: 'purchases',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'product', 'priceAtPaid', 'currency', 'status', 'purchasedAt'],
    description:
      'Mock-checkout order history. Append-only for customers; admins can manage. Price + currency + category are snapshotted at purchase time.',
  },
  access: {
    read: ownPurchasesOrAdmin,
    // Storefront checkout uses overrideAccess: true at the server-action
    // layer with the authenticated user passed explicitly, so this access
    // function only sees direct REST/admin calls — admins-only is right.
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [snapshotProductFields],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'Buyer (Users collection).',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      admin: {
        description: 'Purchased product. ON DELETE RESTRICT — cannot hard-delete a sold product.',
      },
    },
    {
      name: 'priceAtPaid',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Price (major units) at the moment of purchase. Snapshotted by hook.',
        readOnly: true,
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'usd',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'CAD', value: 'cad' },
        { label: 'EUR', value: 'eur' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'categoryAtPaid',
      type: 'select',
      options: PRODUCT_CATEGORY_OPTIONS,
      admin: {
        description: 'Snapshot of the product category at purchase time.',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'completed',
      options: [
        { label: 'Completed', value: 'completed' },
        // Reserved for future use; not surfaced in the demo flow.
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: {
        description: "Demo project — every mock checkout lands as 'completed'.",
        position: 'sidebar',
      },
    },
    {
      name: 'purchasedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
}
