import { getPayload, createLocalReq, type Payload, type PayloadRequest } from 'payload'
import config from '@payload-config'
import { resolveOAuthAgent, oauthAgentName } from '@/lib/workos'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// resolveOAuthAgent returns the plugin's TypedUser union; the resolved row is
// an mcp-agent, so read its name through a narrow view.
const agentName = (u: Awaited<ReturnType<typeof resolveOAuthAgent>>) =>
  (u as { name?: string } | null)?.name

// The WorkOS-OAuth → mcp-agents provisioning path (lib/workos.ts). Regression
// cover for the production bug `oauthAgentName` was built to prevent: a name
// derived from a truncated WorkOS id collided across operators, and concurrent
// first-connects raced on the unique name/workosUserId. Two subjects that
// share the same OLD slice(0,8) prefix but differ in the full id are used to
// prove the slug now derives from the full id.
const SUB_A = 'user_01KSVGZNFZBBZA4N3AQGT8YWY8'
const SUB_B = 'user_01KSVH0000BBZA4N3AQGT8ZZZ9'

let payload: Payload
let req: PayloadRequest

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  req = await createLocalReq({}, payload)
})

async function cleanupAgents(names: string[], subs: string[]) {
  for (const sub of subs) {
    const r = await payload.find({
      collection: 'mcp-agents',
      where: { workosUserId: { equals: sub } },
      limit: 10,
      overrideAccess: true,
      depth: 0,
    })
    for (const a of r.docs) {
      await payload.delete({ collection: 'mcp-agents', id: a.id, overrideAccess: true }).catch(() => {})
    }
  }
  for (const name of names) {
    const r = await payload.find({
      collection: 'mcp-agents',
      where: { name: { equals: name } },
      limit: 10,
      overrideAccess: true,
      depth: 0,
    })
    for (const a of r.docs) {
      await payload.delete({ collection: 'mcp-agents', id: a.id, overrideAccess: true }).catch(() => {})
    }
  }
}

afterAll(async () => {
  await cleanupAgents(['manual-valid-bot'], [SUB_A, SUB_B])
})

describe('oauthAgentName', () => {
  it('derives a deterministic, unique, full-id slug — not a truncated prefix', () => {
    expect(oauthAgentName(SUB_A)).toBe('oauth-01ksvgznfzbbza4n3aqgt8ywy8')
    // The old `slice(0, 8)` gave `oauth-user_01k` for BOTH; the full id differs.
    expect(oauthAgentName(SUB_A)).not.toBe(oauthAgentName(SUB_B))
  })
})

describe('resolveOAuthAgent', () => {
  it('concurrent first-connect for one subject creates exactly ONE agent (race recovery)', async () => {
    await cleanupAgents([], [SUB_A])
    const [a, b] = await Promise.all([
      resolveOAuthAgent(req, { sub: SUB_A }),
      resolveOAuthAgent(req, { sub: SUB_A }),
    ])
    expect(a?.id).toBeDefined()
    expect(b?.id).toBeDefined()
    const count = (
      await payload.count({
        collection: 'mcp-agents',
        where: { workosUserId: { equals: SUB_A } },
        overrideAccess: true,
      })
    ).totalDocs
    expect(count, 'two simultaneous connects must not create two rows or surface a unique error').toBe(1)
  })

  it('a different subject gets its own distinct agent (no cross-operator collision)', async () => {
    const a = await resolveOAuthAgent(req, { sub: SUB_A })
    const b = await resolveOAuthAgent(req, { sub: SUB_B })
    expect(b?.id).not.toBe(a?.id)
    expect(agentName(b)).toBe(oauthAgentName(SUB_B))
  })

  it('a revoked (active:false) agent is denied', async () => {
    await payload.update({
      collection: 'mcp-agents',
      where: { workosUserId: { equals: SUB_B } },
      data: { active: false },
      overrideAccess: true,
    })
    expect(await resolveOAuthAgent(req, { sub: SUB_B })).toBeNull()
  })

  it('a token with no subject is denied', async () => {
    expect(await resolveOAuthAgent(req, {})).toBeNull()
  })
})

describe('mcp-agents name validation', () => {
  it('accepts a clean slug name (id + email auto-derived by hook)', async () => {
    // The deriveAgentEmailHook assigns a UUID `id` + derives `email` from
    // (name, id) when the caller omits them — the test just provides `name`.
    const a = await payload.create({
      collection: 'mcp-agents',
      overrideAccess: true,
      data: { name: 'manual-valid-bot' },
    })
    expect(a.name).toBe('manual-valid-bot')
    expect(typeof a.id).toBe('string')
    expect(a.email).toMatch(/^manual-valid-bot-[a-f0-9]{8}@agents\.local$/)
  })

  it('rejects a name with a space (rejected at validate, NOT silently slugified)', async () => {
    await expect(
      payload.create({
        collection: 'mcp-agents',
        overrideAccess: true,
        data: { name: 'has space' },
      }),
    ).rejects.toThrow()
  })
})
