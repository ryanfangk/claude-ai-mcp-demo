# Payload + Next.js code conventions

## Patterns

- Follow existing patterns. Before creating anything new, find the closest
  existing example and match its structure.
- No new folders or architectural layers without explicit approval.

## MCP access surface — content only, never identity or finance

MCP tools (and any other programmatic-agent integration that authenticates
as an admin) MUST NOT have read or write access to the following
collections — regardless of the admin row's underlying capability:

- `users` — customer PII, soft-delete state, Stripe Customer linkage
- `admins` — admin identity, password hashes, future sub-role field
- `purchases` — financial records, status transitions drive refund liability
- `audit-logs` — read-only system surface; MCP-driven changes would
  poison the trail

The MCP tool set is **content-only**: list/get/create/update on
`products`, `content-sections`, `media-*`. No delete tools.

**MCP writes publish immediately.** This is a non-production demo where the
whole point is operator-free MCP-driven storefront updates — gating each
write on a human "Publish" click would defeat the demonstration. Content
collections accordingly do NOT enable Payload's draft/publish workflow
(`versions: { drafts: true }` is OFF on Products); every save is the live
version. If this project ever ships to production, re-enable drafts on
content collections and restore a force-draft `beforeOperation` hook for
MCP writes (the prior implementation lived in `collections/mcpHooks.ts` as
`forceDraftForMcpWrites`; consult git history when re-introducing).

This rule survives even if the agent is authenticated as an `owner`-role
admin (per ADR 004 once accepted). The constraint is **tool-set scope**,
not access-control granularity — the agent can't reach for surfaces its
tools don't expose. Implementation lives in the MCP server's tool
definitions, not in Payload collection access functions.

Why the surface restriction exists: programmatic agents can hit every
surface their tools expose, in loops, without operator supervision. The
cost of an LLM accidentally soft-deleting a customer, hard-changing a
Purchase status, or rewriting a password hash exceeds any plausible benefit
of exposing those surfaces to an agent. Keep the blast radius bounded to
content where mistakes are reversible (re-edit, overwrite) and don't
affect customer money or identity.

## Payload Local API

- Use the Local API for all server-side data access. Initialize via getPayload:
  ```ts
  import config from '@payload-config'
  import { getPayload } from 'payload'

  const payload = await getPayload({ config })
  const products = await payload.find({ collection: 'products', limit: 50 })
  ```
- Inside hooks and access functions, use `req.payload` — it's already
  initialized on the request object.
- Never call your own REST API from server-side code with fetch().
- Never wrap Local API calls in service classes or repository abstractions.
- Local API calls bypass access control by default (`overrideAccess: true`).
  This is correct for trusted server code (Server Components rendering pages,
  hooks, seed scripts). But in API routes serving user-specific data, you MUST
  pass `overrideAccess: false` and the authenticated `user`:
  ```ts
  // app/api/my-posts/route.ts

  // ❌ LEAKS DATA: returns ALL posts from every user
  export async function GET(request) {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    const posts = await payload.find({
      collection: 'posts',
      // overrideAccess defaults to true — access control is completely ignored
    })
    return Response.json(posts)
  }

  // ✅ SAFE: returns only posts this user can access
  export async function GET(request) {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    const posts = await payload.find({
      collection: 'posts',
      overrideAccess: false,
      user,
    })
    return Response.json(posts)
  }
  ```
- There is no collection-level config to change this default. It must be set
  per-call. The rule: Server Components and hooks can use the default.
  API routes serving user data must always pass `overrideAccess: false` + `user`.

## Project structure

- Collections in separate files, imported into payload.config.ts.
- Split hooks and access functions into their own files only when the
  collection file becomes hard to read.
- Do not modify files in the (payload) route group — they are auto-generated.

## Validation

- Inside Payload collections, use field-level `validate` functions. The
  function receives `(value, ctx)` where ctx contains data, siblingData,
  operation, req, event, and more:
  ```ts
  {
    name: 'price',
    type: 'number',
    validate: (val, { operation }) => {
      if (operation === 'create' && (!val || val <= 0)) return 'Price must be positive'
      return true
    },
  }
  ```
- Validations run on every field change in the admin panel. For expensive
  checks (async lookups, external calls), gate on `event === 'submit'`:
  ```ts
  validate: async (val, { event }) => {
    if (event === 'onChange') return true
    // expensive check only runs on form submit
  }
  ```
- Inside custom API routes, use Zod to validate the incoming request body.
  Payload validate and Zod are separate concerns — don't mix them for the
  same data.

## Surface the constraint in `validate` messages and field descriptions

A `validate` function that rejects user-correctable input must return a
message that **names the rule that failed**, not a bare "Invalid" — and the
same constraint should be stated in the field's `admin.description` so it's
visible *before* the user submits. The operator (or programmatic caller)
should learn the rule from the system, not by repeatedly failing against it.

- ❌ `return 'Invalid name'`
- ✅ `return 'Name must be lowercase letters, digits, and hyphens, max 32 characters'`
- State the constraint in `admin.description` too, so it shows beside the
  field in the admin panel before submission.
- **Prefer rejecting invalid input over silently normalizing it.**
  Slugify-on-save (or any silent transform) stores a value different from
  what was typed with no signal, so the user never learns the rule and any
  reference they made to the typed value breaks. Reserve silent
  normalization for transforms that are unambiguous and lossless.

**Exception — security-sensitive validation rejects generically.** Do not
name the rule for breach-list checks, rate-limit thresholds, or
authentication-failure specifics; a precise message there aids an attacker.
Surface what a legitimate user needs to fix their input; withhold what only
helps someone probing the surface.

## Hooks

- Avoid expensive logic in beforeRead/afterRead — these run on every single
  read query, including admin panel list views.
- Use beforeChange/afterChange for side effects (e.g., creating a profile
  after user registration).
- **High-variance or unbounded external work** (image/PDF generation, AI
  inference, multi-step orchestration, batch jobs) MUST be offloaded to a
  job queue via `req.payload.jobs.queue()` or a managed queue. Don't block
  the hook on these — latency is unbounded.
- **Low-variance idempotent external calls** (a single fast SDK call to a
  stable third-party API — typically <500ms p99) MAY be inline in the hook.
  Required guardrails:
  1. Try/catch around the call
  2. Sentry capture + `sendOperatorAlert()` on failure
  3. An idempotency key — a fresh `crypto.randomUUID()` per call, NOT a
     stable business identifier like the row's `publicId` (a stable key
     replays a cached Stripe failure for ~24h and errors on changed params).
     The DB is the real dedup layer — check for an existing synced ID before
     the call. Full reasoning: data-modeling.md "Stripe data modeling".
  4. Awaited (not fire-and-forget) — caller's request waits for completion

  Example: `stripe.customers.create()` in `Users.afterChange` on `create`,
  using `crypto.randomUUID()` as the idempotency key.
- Always await async hooks when passing `req` with a transactionID — if you
  don't await, the response can return success before a transaction rolls back:
  ```ts
  // Wrong — fire-and-forget inside a transaction
  afterChange: [({ req }) => { someAsyncWork(req) }]

  // Correct — await so the transaction completes before responding
  afterChange: [async ({ req }) => { await someAsyncWork(req) }]
  ```

## Custom endpoints

- Custom Payload endpoints are unauthenticated by default. Always check
  req.user explicitly before processing the request.

## Vercel Blob: treat blobs as immutable

Configure `vercelBlobStorage` with `addRandomSuffix: true` so every upload
produces a unique blob URL. Per Vercel's best-practice guidance: treat
blobs as immutable — instead of overwriting an existing pathname, write a
new blob with a different one. Without the random suffix, Payload reuses
the original filename, and a re-upload overwrites the previous blob,
which causes two real problems:

1. **Stale CDN/browser caches.** Public-store blobs cache up to 1 month
   by default. An overwritten URL serves stale content to users whose
   cache hasn't expired.
2. **Silent file changes for paid content.** A customer who purchased a
   PDF expects the file they downloaded to be the file at that URL
   forever. Overwriting at the same URL changes their purchase silently.

```ts
vercelBlobStorage({
  collections: { 'media-private': true },
  token: requireEnv('BLOB_GATED_READ_WRITE_TOKEN'),
  addRandomSuffix: true,  // immutability — see rule above
}),
```

The Media row's URL field gets the new (suffixed) URL on every save; old
URLs continue to work until the orphaned blob is manually cleaned up.
Storage cost of keeping orphans is negligible at this project's scale.

**Exception:** a blob that's intentionally a frequently-updated mutable
resource (e.g., a single JSON status file refreshed every 5 minutes).
For those, omit `addRandomSuffix`, set an appropriate `cacheControlMaxAge`,
and document the intentional mutability. We don't have any such blobs in
this project yet.

## Vercel Blob plugin scope: public-typed stores only (as of 3.82.1)

`@payloadcms/storage-vercel-blob` only supports **public-typed** Vercel
Blob stores. The plugin's `access` option is typed as `'public'` literal
in `node_modules/@payloadcms/storage-vercel-blob/dist/index.d.ts:10`,
and the value is hardcoded when calling the underlying `@vercel/blob`
SDK's `put()`. Verified on `main` post-3.84.x — the JSDoc says
"Currently, only 'public' is supported. Vercel plans on adding support
for private blobs in the future."

Implication for any new Vercel-Blob-backed collection in this project:
both stores you provision in Vercel must be **public-typed**, regardless
of the intended access semantics. If you need URL-level enforcement
(signed URLs that expire), the plugin can't deliver it today — you'd
need to bypass it and use `@vercel/blob` SDK directly. Until then,
gated content protection rests on (1) `addRandomSuffix: true` for URL
unguessability, (2) Payload collection-level `read` access functions,
and (3) backend routes that stream bytes server-side rather than
returning the raw blob URL to the client.

Revisit when the plugin's `access` typing widens to accept `'private'`.

## Bulk tools come in pairs: a bulk-create implies a bulk-update

Programmatic agents work over collections of rows, not one row at a time — a single agent task routinely seeds N rows and then revises those same N. So whenever a collection gets a **bulk-create** MCP tool (e.g. `createMany<Collection>`), it MUST also get a **bulk-update** tool (`updateMany<Collection>`) in the same change. Shipping only bulk-create forces the agent into N individual update calls (one request per row) for the symmetric operation — the exact inefficiency the bulk-create was added to avoid.

- **The pair is the unit.** Don't add `createMany<X>` without `updateMany<X>`.
- **Match capabilities across the pair:** if bulk-create writes all locales atomically per row and lands as draft, bulk-update must accept the same per-row locale shape and preserve the draft/publish semantics (update of a published row lands as a new draft, per "MCP writes land as draft").
- **Partial success on both:** one bad row in the batch fails and rolls back *that row* without aborting the others; the tool returns a per-row result summary.
- **Applies to any future collection** that gets a bulk-create tool.

**Why this rule exists:** `createManyProducts` shipped without an `updateManyProducts`, and individual creates defaulted to a single locale — so an agent revising a batch (or adding the second locale) had to issue one request per row, defeating the point of the bulk surface.
