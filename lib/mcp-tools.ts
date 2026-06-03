// zod/v3, NOT the project's default zod v4. @payloadcms/plugin-mcp pins zod
// ^3.25.50 and the MCP SDK it feeds builds tool inputSchemas against zod v3
// internals — a v4 schema object would fail at registerTool runtime, not just
// typecheck. zod v4 ships this v3-compat subpath for exactly this interop.
import { z } from 'zod/v3'
import type { PayloadRequest, Where } from 'payload'
import { PRODUCT_CATEGORY_VALUES } from '@/lib/categories'

/**
 * Local structural contract for a custom MCP tool — mirrors what
 * `mcpPlugin({ mcp: { tools: [...] } })` consumes, defined here rather than
 * imported from the plugin ON PURPOSE: the plugin's tool type indexes through
 * its own zod@3 `ZodRawShape`, and checking our zod/v3 schemas against it
 * trips ts2589 ("type instantiation excessively deep"). Type the tool to this
 * local contract; bridge the cross-zod-instance gap with one cast at the
 * payload.config callsite.
 */
type McpCustomTool = {
  name: string
  description: string
  parameters: Record<string, z.ZodTypeAny>
  handler: (
    args: Record<string, unknown>,
    req: PayloadRequest,
    _extra?: unknown,
  ) => Promise<{ content: Array<{ text: string; type: 'text' }>; role?: string }>
}

/** Upper bound on one bulk call. Keeps the synchronous request inside the MCP
 * handler's maxDuration; large jobs should be split across calls. */
const MAX_PRODUCTS_PER_CALL = 100

const productItemSchema = z.object({
  title: z.string().min(1).describe('Title.'),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case (lowercase, hyphen-separated)')
    .describe('URL slug, kebab-case, unique across products.'),
  price: z.number().min(0).describe('Price in major currency units (e.g. 7.99 = $7.99). 0 = free.'),
  category: z.enum(PRODUCT_CATEGORY_VALUES).describe('Product category.'),
  currency: z.string().optional().describe("ISO 4217 lowercase. Defaults to 'usd'."),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  contentMd: z.string().optional().describe('Body as Markdown — rendered to rich text on save.'),
  icon: z.string().optional(),
  featured: z.boolean().optional(),
  publicId: z.string().uuid().optional().describe('Stable external UUID. Auto-generated if omitted.'),
})

type ProductItem = z.infer<typeof productItemSchema>

const productsArraySchema: z.ZodTypeAny = z
  .array(productItemSchema as z.ZodTypeAny)
  .min(1)
  .max(MAX_PRODUCTS_PER_CALL)
  .describe('Array of products to create as drafts (1–100).')

// Row selector for update: identify each row by one of id / slug / publicId.
// The refine REJECTS items carrying none, so a malformed update is bounced at
// the schema boundary with a clear message.
const selectorShape = {
  id: z.union([z.number(), z.string()]).optional().describe('Numeric row id (from a prior create/find).'),
  slug: z.string().optional().describe('Unique slug.'),
  publicId: z.string().optional().describe('Unique publicId (UUID).'),
}
const hasSelector = (d: { id?: unknown; slug?: unknown; publicId?: unknown }) =>
  d.id != null || (typeof d.slug === 'string' && d.slug) || (typeof d.publicId === 'string' && d.publicId)
const SELECTOR_MSG = 'Each item must identify the row by one of: id, slug, or publicId.'

const productUpdateItemSchema = z
  .object({
    ...selectorShape,
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    contentMd: z.string().optional().describe('Body as Markdown — rendered to rich text on save.'),
    icon: z.string().optional(),
    price: z.number().min(0).optional(),
    category: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
    currency: z.string().optional(),
    featured: z.boolean().optional(),
  })
  .refine(hasSelector, { message: SELECTOR_MSG })

const productUpdatesArraySchema: z.ZodTypeAny = z
  .array(productUpdateItemSchema as z.ZodTypeAny)
  .min(1)
  .max(MAX_PRODUCTS_PER_CALL)
  .describe('Array of product updates (1–100). Each item: a selector (id/slug/publicId) + fields to change.')

type Selector = { id?: number | string; slug?: string; publicId?: string }

async function resolveRowId(req: PayloadRequest, sel: Selector): Promise<number | string> {
  if (sel.id != null) return sel.id
  const field = sel.slug ? 'slug' : 'publicId'
  const value = sel.slug ?? sel.publicId
  const found = await req.payload.find({
    collection: 'products',
    where: { [field]: { equals: value } } as Where,
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    req,
  })
  if (found.totalDocs === 0) {
    throw new Error(`No products row matches selector ${JSON.stringify(sel)}.`)
  }
  return found.docs[0].id
}

function authGuard(req: PayloadRequest, action: string) {
  if (!req.user) {
    return { content: [{ type: 'text' as const, text: `Error: no authenticated MCP agent on the request — cannot ${action}.` }] }
  }
  return null
}

function parseError(label: string, error: { issues: unknown }) {
  return { content: [{ type: 'text' as const, text: `Error: invalid \`${label}\` payload.\n${JSON.stringify(error.issues, null, 2)}` }] }
}

/**
 * createManyProducts — create many Product rows in one MCP call.
 *
 * Each row is created as a DRAFT (never published). Per-item transaction:
 * a failed product (e.g. duplicate slug) rolls back cleanly and is reported
 * without aborting the others. Attribution runs as the authenticated
 * mcp-agent (overrideAccess: false + req.user).
 */
export const createManyProductsTool: McpCustomTool = {
  name: 'createManyProducts',
  description:
    'Create many Product rows in ONE call from a JSON array — use this instead of calling createProducts repeatedly. Every product is created as a DRAFT (a human admin publishes later). Per item: title (required), slug (kebab-case, unique), price (major units, e.g. 7.99), category; optional subtitle, description, contentMd (Markdown → rich text), icon, currency (default usd), featured, publicId (UUID; auto-generated if omitted). Partial success: a failed product (e.g. duplicate slug) is reported without aborting the others. Max 100 per call.',
  parameters: { products: productsArraySchema },
  handler: async (args: Record<string, unknown>, req: PayloadRequest) => {
    const denied = authGuard(req, 'create products')
    if (denied) return denied

    // Re-parse defensively: a transport that skips validation can't slip
    // malformed rows through.
    const parsed = productsArraySchema.safeParse(args.products)
    if (!parsed.success) return parseError('products', parsed.error)

    const products: ProductItem[] = parsed.data
    const payload = req.payload
    const results: Array<
      | { index: number; slug: string; ok: true; id: number | string; publicId: string }
      | { index: number; slug: string; ok: false; error: string }
    > = []
    let created = 0
    let failed = 0

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      // One transaction per product so a failed row rolls back without
      // aborting the rest. Passing `req` keeps access control + the
      // force-draft hook intact.
      const tx = await payload.db.beginTransaction()
      const prevTx = req.transactionID
      if (tx) req.transactionID = tx
      try {
        const doc = await payload.create({
          collection: 'products',
          data: {
            title: p.title,
            slug: p.slug,
            price: p.price,
            category: p.category,
            currency: p.currency ?? 'usd',
            subtitle: p.subtitle,
            description: p.description,
            contentMd: p.contentMd,
            icon: p.icon,
            featured: p.featured,
            publicId: p.publicId ?? crypto.randomUUID(),
            _status: 'draft',
          },
          draft: true,
          overrideAccess: false,
          req,
        })
        if (tx) await payload.db.commitTransaction(tx)
        created++
        results.push({
          index: i,
          slug: p.slug,
          ok: true,
          id: doc.id,
          publicId: (doc as unknown as { publicId: string }).publicId,
        })
      } catch (err) {
        if (tx) await payload.db.rollbackTransaction(tx)
        failed++
        results.push({
          index: i,
          slug: p.slug,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      } finally {
        req.transactionID = prevTx
      }
    }

    const summary = { created, failed, total: products.length, status: 'draft', results }
    return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] }
  },
}

/**
 * updateManyProducts — update many existing Product rows in one call.
 *
 * Each item identifies a row by id/slug/publicId and supplies any subset of
 * fields. Update of a PUBLISHED row lands as a new DRAFT (the live version
 * stays live). Per-item transaction: partial success.
 */
export const updateManyProductsTool: McpCustomTool = {
  name: 'updateManyProducts',
  description:
    'Update many existing Product rows in ONE call. Each item must identify the row by `id`, `slug`, OR `publicId` (an item with none is rejected). Supply only the fields to change. Update of a published row lands as a DRAFT — the live version stays live while the edit waits for a human to publish. Partial success: a failed item is reported without aborting the others. Max 100 per call.',
  parameters: { products: productUpdatesArraySchema },
  handler: async (args: Record<string, unknown>, req: PayloadRequest) => {
    const denied = authGuard(req, 'update products')
    if (denied) return denied

    const parsed = productUpdatesArraySchema.safeParse(args.products)
    if (!parsed.success) return parseError('products', parsed.error)

    const items = parsed.data as Array<Record<string, unknown>>
    const payload = req.payload
    const results: Array<
      | { index: number; ref: string; ok: true; id: number | string }
      | { index: number; ref: string; ok: false; error: string }
    > = []
    let updated = 0
    let failed = 0

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const ref = String(it.slug ?? it.publicId ?? it.id ?? '?')
      const tx = await payload.db.beginTransaction()
      const prevTx = req.transactionID
      if (tx) req.transactionID = tx
      try {
        const id = await resolveRowId(req, it as Selector)
        const data: Record<string, unknown> = {}
        for (const k of ['title', 'subtitle', 'description', 'contentMd', 'icon', 'price', 'category', 'currency', 'featured']) {
          if (it[k] !== undefined) data[k] = it[k]
        }
        await payload.update({
          collection: 'products',
          id,
          data,
          draft: true,
          overrideAccess: false,
          req,
        })
        if (tx) await payload.db.commitTransaction(tx)
        updated++
        results.push({ index: i, ref, ok: true, id })
      } catch (err) {
        if (tx) await payload.db.rollbackTransaction(tx)
        failed++
        results.push({ index: i, ref, ok: false, error: err instanceof Error ? err.message : String(err) })
      } finally {
        req.transactionID = prevTx
      }
    }

    const summary = { updated, failed, total: items.length, status: 'draft', results }
    return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] }
  },
}
