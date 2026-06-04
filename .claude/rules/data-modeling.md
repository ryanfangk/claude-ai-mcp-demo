# Data modeling rules

Conventions and discipline for schema design, migrations, and field configuration. Portable patterns this project applies across collections; vendor-specific notes call out the integration. Companion to `engineering-principles.md` (abstract cross-project rules), `workflow.md` (process discipline), and `documentation.md` (writing-side rules) — this file holds the **schema-level** rules.

## Migration authoring: backfill before promoting to NOT NULL

When adding a new field with `required: true` (which the data layer typically translates to a `NOT NULL` constraint on the column), the auto-generated migration WILL FAIL on tables with existing rows unless you add an explicit backfill step before the NOT NULL promotion. Auto-generators do not detect the dependency — verify the migration file and add the backfill manually.

Required pattern:

1. `ADD COLUMN <new> <type>` (no NOT NULL initially — column is nullable)
2. `UPDATE <table> SET <new> = <default-expr> WHERE <new> IS NULL` (backfill existing rows; the default-expr should match the field's `defaultValue` semantics — e.g., `gen_random_uuid()` for UUIDs, a literal for enum defaults, a derived value for computed fields)
3. `ALTER COLUMN <new> SET NOT NULL` (promote constraint)

For tables that have a `_<collection>_v` versions sidecar (collections with drafts enabled), apply the same pattern to the sidecar's mirror column.

Any auto-generated migration that adds a NOT NULL column without an intervening UPDATE step is a bug. Hand-edit before applying.

## UUID primary keys — the `id` IS the external identifier

This project uses UUID PKs across every collection (`postgresAdapter({ idType: 'uuid', ... })` in `payload.config.ts`). The row's `id` is the external identifier — URLs, third-party API calls, webhook payloads, federated identity all reference `id` directly. **No separate `publicId` sidecar.** The hybrid integer-PK + UUID-publicId pattern is explicitly rejected for this project: at demo scale the join-perf benefit doesn't pay for the schema, code, and admin-panel complexity of carrying two identifiers per row.

When you add a new collection: don't add a `publicId` field. The PK already is one. Generate `data.id = crypto.randomUUID()` in `beforeValidate` only if a hook needs the id BEFORE insert (e.g. deriving another column from it — see `MCPAgents.deriveAgentEmailHook`); otherwise let Payload assign it.

**Exception — production-scale read-heavy joins.** If a future collection genuinely sees billions of rows under hot integer-PK joins where UUID-PK overhead would matter, that one collection can opt into the hybrid (integer PK + UUID `publicId`). State the join-perf case in the collection comment when you do; don't do it speculatively.

**For third-party API idempotency:** generate a fresh `crypto.randomUUID()` per attempt — NOT the row's `id` and NOT any stable business identifier (a stable key replays a cached vendor failure for ~24h and errors on changed params). The real dedup layer is the database (a unique column/constraint on the synced ID), not the key. Full per-operation reasoning is in the Stripe data modeling section below.

## Critical data: soft-delete or RESTRICT-FK, never unprotected hard delete

Per the critical-data-protection principle (financial records, audit logs, compliance data, and customer-facing history must survive the row's apparent end-of-life — either via soft-delete with access-layer guards, or via `ON DELETE RESTRICT` foreign keys that block parent deletion while critical children exist): financial records, audit trails, identity columns, and anything load-bearing for compliance use soft-delete (`deletedAt` + access-layer guards) OR `ON DELETE RESTRICT` foreign keys. Never unprotected hard delete on critical data. Match the lifecycle:

- "Inactive but historical" (deactivated users, retired products with purchase history) → soft-delete
- "Pipeline / draft cleanup with active rows protected" (publishing workflows where unsold drafts can be deleted) → `ON DELETE RESTRICT` from child rows

## Localization-aware field design

For schemas with built-in localization (sidecar `<collection>_locales` tables):

- Be explicit about which fields are localized (declared) and which are not (canonical across locales). The table mapping should be auditable at a glance.
- Cross-system integrations consume single-locale strings; explicitly fetch the canonical locale in helpers rather than relying on hook-time locale-leak from `req.locale`. Helpers that read the wrong locale produce silent data corruption (e.g., zh title written to a third-party system that uses the value as English-facing display text).
- When the calling context's locale is known and matches the canonical locale, skip the re-fetch (data layer round-trips compound at scale).

## Stripe data modeling

When storing Stripe object IDs in the DB:

- **Use domain-named columns:** `stripeCustomerId`, `stripeProductId`, `stripePaymentIntentId`. NOT generic `stripeID` — a single shared column that just stores "the Stripe ID for this row" makes queries like "find product by Stripe ID" indistinguishable from "find customer by Stripe ID" since both target the same column name in different tables, and operator-side search across the DB by `stripeID = '...'` can't tell which collection the result is from. This is an anti-pattern verified in `@payloadcms/plugin-stripe` (which uses generic `stripeID` on every synced collection).
- **When the same Stripe object reaches a row through multiple Stripe relationships** (e.g., a Purchase row receives a Customer ID both transitively via its User and directly from the Session), denormalize it onto the row that uses it for queries — but document the denormalization in the field's `admin.description` so a future agent doesn't see "redundant data" and prune it. Example pattern: `Purchases.stripeCustomerId` is denormalized from `session.customer`; same value lives on `Users.stripeCustomerId`. The denormalization buys (a) direct webhook lookup without the User join, (b) Purchase queryability by Customer if the User row is soft-deleted, and (c) operator-side trace-by-Customer across all Purchases. Cost is the one-time write at Purchase insert — Customer IDs don't change for a given Stripe Customer.
- **Make Stripe IDs unique + indexed** (`unique: true` + `index: true`) for find-by-Stripe-ID lookups in webhook handlers.
- **Store Stripe IDs as nullable** until sync semantics are decided. Customer sync = nullable until first sync (populated by Users.afterChange); Product sync = nullable until first publish (populated by Products.afterChange).
- **Don't store Stripe Price IDs** unless checkout has been switched to `price:` references. Inline `price_data` doesn't need Stripe Price persistence; the catalog mirror is one-way Payload → Stripe.
- **Wire-protocol versioning** (per the verify-wire-protocol-version-before-bumping principle — SDK packages that pin the remote service's API version per release silently shift the wire shape on package bump): the schema's webhook handlers consume Stripe payloads. They must tolerate the API version configured in the Stripe Dashboard's webhook endpoint AND the SDK's pinned `apiVersion`. Both must match. Verify on every SDK upgrade.
- **Idempotency keys** for Stripe API calls: generate a fresh `crypto.randomUUID()` per call for ALL operations (create AND update). Do NOT use the row's `id` or any stable business identifier — Stripe caches the first result under a key for ~24h *including 500s*, so a stable key that catches a transient failure replays it for 24h, and a stable key reused with changed params errors with `StripeIdempotencyError`. The DB is the real dedup layer: check for an existing `stripeCustomerId`/`stripeProductId` (early-return before the call) and rely on unique constraints on Purchase rows. The idempotency key only guards against double-submit within one logical attempt — which a fresh UUID handles correctly.
- **Currency** must be stored explicitly on Products (or whatever row triggers a Stripe Session), as ISO 4217 lowercase. Don't hardcode the currency in the Session-creation code; read from the row. Even single-currency projects benefit from the forward-compat.

## Don't store derived or computed data

Fields that can be deterministically derived from other columns should NOT be stored. Compute at read time. Examples:

- Total purchase count for a user → query the `purchases` collection, don't store on `users`
- "Has user bought X?" → query, don't store
- Display-formatted prices → format at render time, don't store the formatted string

**Exception:** denormalize when the read frequency × cost-of-computation makes the write cost worthwhile (typical at scale, rare at MVP). Document the trade-off in a comment on the denormalized column so a future agent doesn't see "redundant data" and prune it.

## API uniformity: human and programmatic callers are equivalent

This project's API surface is accessed from human-facing UI flows AND from programmatic clients (this includes both LLM agents acting through an MCP server and any other future automated integration). Per the API-uniformity principle — every endpoint must be designed for the strictest caller, regardless of who's expected to call it; programmatic callers eventually touch every surface — every endpoint must be designed with machine-precision input validation, structured error responses, predictable rate-limit behavior, deterministic idempotency, complete observability.

Implications for schema + endpoint design:

- **Input validation lives in the API layer**, not the UI. The form may filter empty values; the API must still reject them.
- **Errors are machine-readable** (typed exceptions, structured response bodies with stable codes). Don't return string-only error messages.
- **Idempotency keys** are first-class on any mutation that could be retried — including hooks called from MCP tools (e.g., `Products.afterChange` firing from an MCP `create_product` call must be idempotent under retry).
- **Rate limits** apply to programmatic and human callers identically — the rate limiter's key should be the authenticated user/agent, not the IP.

## Don't store secrets, sensitive payment data, or unsanitized user HTML

- **Secrets** (API keys, tokens) belong in environment variables, not DB columns. The `requireEnv()` helper pattern + Vercel env-var injection is the canonical path.
- **Payment data** (raw PAN, CVV) MUST NOT be stored. Stripe handles all card data; we only store opaque Stripe IDs (`pi_xxx`, `cus_xxx`).
- **User-provided HTML/Markdown** is rendered via Payload's Lexical editor (which produces structured JSON, not raw HTML). Don't add `type: 'textarea'` fields that accept and render raw HTML without sanitization.

## Field naming conventions

- **Identifiers** end with `Id` (e.g., `stripeCustomerId`, `workosUserId`) — never `Identifier`, `Key`, `Ref` for primary external IDs.
- **External-platform identifiers must name the foreign object precisely.** When a column stores an ID issued by a third-party platform (Stripe, Twilio, Resend, Vercel, GitHub, etc.), the column name must include the foreign object type *as the foreign platform calls it*, not a paraphrase or a category. The reader must be able to map the column name to a specific object in the foreign API's docs without context.
  - ✅ `stripePaymentIntentId` (Stripe PaymentIntent, `pi_...`), `stripeChargeId` (Stripe Charge, `ch_...`), `stripeSetupIntentId` (Stripe SetupIntent, `seti_...`), `stripeRefundId` (`re_...`)
  - ❌ `stripePaymentId` — "Payment" doesn't map to one Stripe object; it could mean PaymentIntent, Charge, Refund, or an aggregate. The column's wire value is unambiguous at runtime but the schema is ambiguous to anyone reading the collection config or writing a query.
  - ❌ `stripeTransactionId` — Stripe has multiple things you could call a "transaction" (BalanceTransaction, PaymentIntent, Charge); ambiguous.
  - **Why it matters:** webhook handlers, refund flows, and operator queries all start from "I have a `pi_xxx` / `ch_xxx` / `re_xxx` — what's its row?" If the column name doesn't tell you which kind of ID it holds, every reader has to grep the codebase to figure out what gets written. A specific name keeps the SQL self-explanatory: `SELECT * FROM purchases WHERE stripe_payment_intent_id = 'pi_...'` requires no context to read.
  - **Applies symmetrically to non-Stripe platforms.** Twilio: `twilioMessageSid` (not `twilioMessageId`). Vercel Blob: `vercelBlobPathname` (not `vercelBlobId`). Resend: `resendEmailId` (the Email object). Use the platform's own terminology and object name verbatim.
- **Booleans** use positive framing (e.g., `featured: boolean`, not `notHidden: boolean`).
- **Timestamps** end with `At` (e.g., `deletedAt`, `createdAt`, `purchasedAt`).
- **Counts** end with `Count` (rare in this project since we avoid storing derived counts per the "don't store derived data" rule).
- **Currency amounts** stored in major units (dollars) with a paired `currency` field — convert to cents at the API boundary.

## Indexes

- Every column you `WHERE` by in normal queries needs an index. Payload's `index: true` on a field config translates to a btree index.
- Unique constraints (`unique: true`) auto-create unique indexes — don't add a separate index.
- **Partial unique indexes** (e.g., `UNIQUE (user, product) WHERE status IN ('active-states-only')`) are not expressible via Payload's `CompoundIndex` type config — write the index in the migration manually. The pattern:
  ```sql
  CREATE UNIQUE INDEX "purchases_user_product_active_unique"
    ON "purchases" ("user_id", "product_id")
    WHERE status IN ('completed', 'disputed')
  ```
  Place this in the migration's `up()` block after Payload's auto-generated SQL. Drop in `down()` with `DROP INDEX IF EXISTS "<name>"`. Choose the partial-WHERE clause carefully — it determines which states block re-purchase (refunded/lost states excluded → customer can re-buy after refund).

## Foreign key semantics

Be explicit about `ON DELETE` behavior:

- `RESTRICT` — block parent deletion when children exist. Right for "this row protects critical child data" (e.g., Products with Purchases).
- `SET NULL` — null the FK on parent deletion. Right when child rows survive the parent's absence (rarely used in this project).
- `CASCADE` — delete children with parent. Right for tightly-coupled rows (e.g., Profile follows User).
- **Default in Payload generation is often `SET NULL`** — verify this in the generated migration matches the intended semantic; change to `RESTRICT` or `CASCADE` when not.

## Designing a principal — full lifecycle, not just creation

When adding a collection that represents a **principal** (an identity that authenticates and is attributed actions — `admins`, `users`, `mcp-agents`, future service identities), design its **complete lifecycle** before building, not just the create path: how it's created, how it authenticates, its **owner + relationships**, and its **deprovisioning cascade** (what deactivates it, and what that revocation must also revoke). Walk BREAD (Browse/Read/Edit/Add/Delete), and write the revocation path down in the plan.

- **Credential issuance is gated by deprovisioning reliability.** A long-lived credential (static API key, token) may be issued to a principal only when the principal's **owner-deactivation reliably cascades** to revoke that credential:
  - Owner = an identity this system controls (e.g. an `admins` row) → reliable via an `afterChange`/`afterDelete` hook → credential OK.
  - Owner = an external identity (e.g. a federated user deactivated in the IdP) → reliable **only** once a deactivation webhook drives the cascade; until that exists, **don't issue the credential** to that principal.
- **Why:** `mcp-agents` surfaced this — a static API key on an OAuth (WorkOS-federated) identity would survive the human's deactivation in WorkOS, leaving a credential that outlives its owner (a deprovisioning hole). Keys are therefore allowed on admin-owned service agents (reliable cascade) and withheld from OAuth-owned agents until a WorkOS deactivation webhook exists. (Engineering principle: "Design a principal's full lifecycle before building it.")

## Agent / service-account principals: Google-Cloud-style naming — unique, human-readable name

When a collection represents an **agent or service-account-type principal** (a programmatic identity that holds credentials — `mcp-agents`, future bots/service accounts), follow Google Cloud's service-account naming model: a **unique, human-readable name** (GCP's `accountId` — unique within the project, forms the email local-part) **plus** an opaque unique machine id (the row's UUID `id`, GCP's numeric `uniqueId`).

- **The human-facing `name` MUST be unique** — set `unique: true` (the DB unique index is the enforcement; per "derive unique values from a unique source," uniqueness is enforced atomically at insert, never pre-checked). Two principals can never share a name.
- **Why:** operators manage these principals — and their long-lived credentials — by eye. A non-unique name makes two identities indistinguishable in list views, the audit trail, and the credential-management UI, so an operator can **accidentally revoke or delete a credential that belongs to a *different* principal that's currently in use by someone else.** A unique name makes every principal unambiguous at a glance.
- **The name is the human handle; the `id` (UUID PK) is the machine handle.** Keep deriving machine-facing values (the email local-part, joins, idempotency) from the *unique id*, never from the name — but the name itself must still be unique so the human layer is unambiguous too. The two are complementary, not a substitute for each other.
- Companion to "derive unique values from a unique source" and "design a principal's full lifecycle." Applied: `mcp-agents.name` is `unique: true`; the email is `<name-slug>-<id[:8]>@domain` (readable from the name, unique from the id).

## Model "can be several at once" as capabilities, not a rigid type enum

When an entity can simultaneously be more than one "kind," do **not** encode kind as a single exclusive enum — model the **capabilities/credentials it holds** (presence-of-X) and derive any kind label. A rigid enum forces a false either/or and breaks the moment an entity is both. Example: an MCP agent may hold a federated (OAuth) identity *and* a static API key — `kind: oauth | service` can't express "both"; the credentials themselves (a `workosUserId`, the presence of API keys) are the indicator, with any `kind` kept only as a derived UI convenience.

## Derive unique values from a unique source; the constraint is the backstop, not a pre-check

A unique **derived** value must be derived from a guaranteed-unique source (the row's UUID `id`, or another unique column), never from collidable human input (a name/label). The database UNIQUE index is the authoritative cross-domain enforcement, checked atomically at insert — a pre-`SELECT` "is it taken?" **races** (two concurrent inserts both see "free," one then fails) and is not a substitute. If you must derive from collidable input, append a unique disambiguator (a UUID segment) and **catch the constraint violation** on insert; never pre-check-then-insert. Example: the mcp-agent sending address is `<name-slug>-<id-segment>@<domain>` — readable from the name, unique from the row's UUID `id`, with the unique index as the backstop that never actually fires.

## Verify an externally-sourced column's source before adding it

A column that exists to capture a value from an **external source** (a third-party token claim, a webhook field, an API response, an IdP profile) must not be added until you have **confirmed the source actually carries that value** — ideally by inspecting a real payload, not by assuming the field is present.

The check is cheap at design time and expensive to discover later: a column added on an unverified assumption ships, never populates, and becomes dead weight that misleads every future reader (the schema claims the data exists when it never arrives). Worse for schema-coupled values — you can't tell "always null because no one set it" from "always null because the source never provides it" without going back to the source.

- **Before adding the column:** obtain one real instance of the source payload (decode a real token, log one real webhook, call the API once) and confirm the field is present and shaped as expected.
- **If you can't verify the source provides it, don't add the column.** Capture the *stable* identifier the source definitely provides (e.g. an id/`sub`) and derive or join for the rest.
- **Applies symmetrically to fields on existing collections,** not just new collections.

**Principle:** never add a column for externally-sourced data you haven't confirmed the source emits.

## A value set used across validation, persistence, type, and UI lives in one module

When a fixed set of allowed values — categories, statuses, roles — must appear in more than one representation (a zod enum at the API boundary, a Payload `select` field's `options` that drives the DB enum, the TypeScript union type, UI option lists), declare it **once** as a `const` tuple in a single module and derive every representation from it. Do not hand-maintain the same literals in the collection config, the validation schema, and the type.

- The canonical declaration is a `const [...] as const` tuple; the zod enum, the `options` array, the union type, and any label map all derive from it.
- There is **no compile-time link** between a literal in a zod `.enum([...])` and a literal in a Payload `options: [...]` array — they drift silently, and the failure surfaces as "valid input to one layer, rejected by another" (e.g. a category an MCP tool accepts but the column constraint refuses).
- Pattern in this project: `lib/categories.ts` is the single source for product and content-section categories — the zod enums, the `select` options, the types, and the labels all derive from its `const` tuples.

**Caveat — unify only the *same* fact.** Two value sets that happen to share members today but are each free to change independently are not duplication; fusing them couples two decisions that should move separately. Unify only when, by definition, a change to one set must be a change to the other in the same commit.
