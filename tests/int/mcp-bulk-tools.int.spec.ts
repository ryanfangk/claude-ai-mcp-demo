import { getPayload, createLocalReq, type Payload, type PayloadRequest } from 'payload'
import config from '@payload-config'
import { createManyProductsTool, updateManyProductsTool } from '@/lib/mcp-tools'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Bulk MCP tools: createManyProducts + updateManyProducts. Invoked with a
// constructed MCP-agent req — per-item transaction, partial success, immediate
// publish (the demo collection has no draft layer). Demo product schema is
// single-locale; selectors are `id` (UUID) or `slug` only.

let payload: Payload
let req: PayloadRequest
const productIds = new Set<string>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function run(tool: any, key: string, items: unknown[]) {
  const res = await tool.handler({ [key]: items }, req)
  return JSON.parse(res.content[0].text)
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  // The bulk tools call `payload.create/update(... overrideAccess: false, req)`
  // — they need a `user` on the req whose `collection === 'mcp-agents'` for
  // the products access functions to permit the write, plus `payloadAPI: 'MCP'`
  // so anything keyed on that signal (future hooks, audit attribution) behaves
  // like a real MCP request.
  req = await createLocalReq(
    {
      user: {
        id: crypto.randomUUID(),
        collection: 'mcp-agents',
        email: 'bulk-test@agents.local',
      } as never,
    },
    payload,
  )
  req.payloadAPI = 'MCP'
})

afterAll(async () => {
  for (const id of productIds) {
    await payload.delete({ collection: 'products', id, overrideAccess: true }).catch(() => {})
  }
})

async function seedProduct(slug: string) {
  const p = await payload.create({
    collection: 'products',
    overrideAccess: true,
    data: { slug, title: 'Orig', price: 5, currency: 'cad', category: 'cheatsheet' },
  })
  productIds.add(p.id as string)
  return p
}

describe('createManyProducts', () => {
  it('creates rows that publish immediately + renders contentMd to rich text', async () => {
    const r = await run(createManyProductsTool, 'products', [
      { title: 'Bulk One', slug: 'bulk-create-1', price: 9.99, category: 'cheatsheet', contentMd: '# Hello' },
    ])
    expect(r.created).toBe(1)
    expect(r.failed).toBe(0)
    expect(r.status).toBe('published')

    const id = r.results[0].id as string
    productIds.add(id)
    const created = await payload.findByID({ collection: 'products', id, overrideAccess: true })
    expect(created.title).toBe('Bulk One')
    expect(created.slug).toBe('bulk-create-1')
    expect(
      (created as { contentMd?: string | null }).contentMd,
      'contentMd is cleared after conversion',
    ).toBeNull()
    expect(created.content, 'contentMd rendered to a Lexical node tree').toBeTruthy()
  })

  it('partial success: a duplicate slug fails without aborting the rest', async () => {
    await seedProduct('bulk-create-dup')
    const r = await run(createManyProductsTool, 'products', [
      { title: 'Fresh', slug: 'bulk-create-fresh', price: 1, category: 'guide' },
      { title: 'Dup', slug: 'bulk-create-dup', price: 1, category: 'guide' },
    ])
    expect(r.created).toBe(1)
    expect(r.failed).toBe(1)
    productIds.add(r.results[0].id as string)
    const dupResult = r.results[1]
    expect(dupResult.ok).toBe(false)
    expect(dupResult.error).toMatch(/unique|duplicate|slug/i)
  })
})

describe('updateManyProducts', () => {
  it('updates by slug — change lands and reads back', async () => {
    const p = await seedProduct('bulk-upd-slug')
    const r = await run(updateManyProductsTool, 'products', [
      { slug: 'bulk-upd-slug', title: 'New Title', price: 12.5 },
    ])
    expect(r.updated).toBe(1)
    expect(r.failed).toBe(0)

    const after = await payload.findByID({ collection: 'products', id: p.id, overrideAccess: true })
    expect(after.title).toBe('New Title')
    expect(after.price).toBe(12.5)
  })

  it('updates by id (UUID) — change lands and reads back', async () => {
    const p = await seedProduct('bulk-upd-uuid')
    const r = await run(updateManyProductsTool, 'products', [
      { id: String(p.id), featured: true },
    ])
    expect(r.updated).toBe(1)
    const after = await payload.findByID({ collection: 'products', id: p.id, overrideAccess: true })
    expect(after.featured).toBe(true)
  })

  it('partial success: a nonexistent slug fails without aborting the rest', async () => {
    await seedProduct('bulk-upd-mixed')
    const r = await run(updateManyProductsTool, 'products', [
      { slug: 'bulk-upd-mixed', featured: true },
      { slug: 'does-not-exist', featured: true },
    ])
    expect(r.updated).toBe(1)
    expect(r.failed).toBe(1)
    const miss = r.results.find((x: { ref: string }) => x.ref === 'does-not-exist')
    expect(miss.ok).toBe(false)
    expect(miss.error).toMatch(/no products row matches/i)
  })

  it('rejects an item missing id AND slug (schema validation)', async () => {
    // A missing selector fails the schema refine → the tool returns a plain
    // error string (not the JSON summary).
    const res = await updateManyProductsTool.handler(
      { products: [{ title: 'no selector' }] },
      req,
    )
    expect(res.content[0].text).toMatch(/id.*slug|invalid/i)
  })
})
