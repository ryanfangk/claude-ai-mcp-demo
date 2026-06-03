## When authoring a rule, examine it for exceptions

Before any rule lands — in a rule file, an ADR, a convention, a doc — stress-test it with one question: **"Can there be a legitimate exception?"** A rule stated as an absolute ("never X", "always Y") that has real exceptions is either wrong at the edges or quietly ignored when someone hits one — and an unexamined absolute reads as authoritative while being false in the cases it didn't consider.

- **Ask it explicitly** for every rule: where would honoring this be wrong, and what's the carve-out?
- **State the exception in the rule itself** — name the carve-out and its boundary so a reader doesn't have to guess whether their case is covered: "No X — except Y, because Z."
- **If there genuinely are none, say so** ("no exceptions — absolute") rather than leaving it silent, so the next author sees it was examined, not overlooked.
- **No exception to this rule itself:** the *examination* is always done; its *result* may legitimately be "no exceptions."

**Why:** an absolute with unstated exceptions gets misapplied at the edge or discarded wholesale when someone meets a valid one. Naming the boundary up front keeps a rule both correct and trusted. Surfaced when "write for a zero-context reader" was first stated as a blanket ban, though verifiable references — commit SHAs, vendor names, an author's name where identity is the subject — are legitimate exceptions.

## Code changes require doc changes

When a code change affects naming, behavior, configuration, or public API surface, the agent must grep the docs for references to the affected name/concept and update them in the same commit or PR. A code change without the corresponding doc update is incomplete.

- **Renames:** `grep -rn "OLD_NAME" docs/ .claude/rules/` before committing. Update every hit.
- **Behavior changes:** find the doc that describes the behavior (architecture.md, collections.md, user-flows, deployment.md) and update the description.
- **New features:** add to features.md + the relevant reference doc.
- **Removed features:** remove from features.md + the relevant reference doc.

This is the process-side enforcement of the "every code change that affects behavior or naming must update the docs that describe it" engineering principle.

## Commit and push require explicit approval

Do not `git commit` or `git push` until the operator explicitly asks for it. Make changes in the working tree, leave them uncommitted, report what changed, and wait for the go-ahead. This holds even on a feature/layer branch where committing would otherwise be routine.

- **No commits without an explicit "commit" instruction.** Staging (`git add`) is fine; creating the commit is not, until asked.
- **No pushes without explicit approval.** The push gate is additional to and stricter than the commit gate (force-push to `main` needs per-session confirmation — see the global git rule).
- Applies to every change — code, docs, rules, config — including changes the agent itself proposed.

**Why:** the operator wants to review the working tree and decide what gets bundled into each commit / PR. Auto-committing removes that checkpoint and pre-bundles changes the operator may want to split, amend, or discard.

## Migration naming

Migration names must be specific enough that the schema change is immediately obvious from the filename alone — without reading the file body.

- **Required:** name the table(s) and the operation(s), e.g. `purchases_status_partial_unique` or `users_soft_delete_add_deleted_at`.
- **Prohibited:** generic names like `schema_update`, `payments_changes`, or any name keyed to a development stage (`layer3_*`, `phase2_*`) — stage references rot when the project re-organizes, but the table+operation is stable.
- **Why:** `pnpm migrate:create` embeds the name in the filename and in `payload_migrations`. When diagnosing production incidents or reviewing rollback options, the filename is the first signal. A generic name forces file-open to understand scope; a specific name makes scope legible at a glance in `ls migrations/`.

## Local dev: clearing an interactive drizzle prompt (rename/create ambiguity)

`pnpm migrate:create` (and the dev server's `next dev` schema-push) can stop on an interactive prompt like *"Is column X created or renamed from another column?"*. This happens because migrations here are hand-edited, so drizzle's internal schema snapshot drifts from the live schema, and drizzle can't tell a create from a rename — an agent can't drive the arrow-key select, and picking wrong corrupts the diff.

**Local recovery (development only, and only when there is NO production data — assume none on local):**

```bash
docker compose down -v   # drop the volume (wipes local data)
docker compose up -d
pnpm migrate             # re-apply migrations from a clean baseline → no drift, no prompt
pnpm seed                # recreate the first admin + sample data
```

Then re-run whatever hit the prompt (`pnpm dev`, or `pnpm migrate:create <name>` against the clean baseline — an additive diff generates non-interactively).

- **Never** run `docker compose down -v` (or any volume wipe) against a database that holds real data — it is irreversible. This procedure is strictly for the local, data-disposable dev DB.
- To author a migration when `migrate:create` keeps prompting on unrelated pre-existing drift: reset as above to a clean baseline, then capture the intended schema by diffing a `pg_dump --schema-only` of the baseline against a dump taken after a dev-push of the new code, and hand-write the migration from that diff (this is the hand-edit step the migration-naming rule already assumes). Verify by applying it to a fresh baseline and re-diffing.

## ADR / spec verification discipline

Any architectural decision (ADR) or implementation spec that depends on a framework/library feature delivering a load-bearing guarantee must verify that the feature is actually reachable from this project's code path **before** the ADR is accepted or the spec is finalized.

- **Required citation in the ADR/spec body:** the exact API call that delivers the capability, with a citation that a reader can independently verify — `node_modules/<pkg>/dist/...:LINE`, a type signature, a docs URL with a stable anchor, or an upstream issue/PR. Not "the plugin supports X" — "`Plugin({ option: 'X' })` per source at path-and-line on version Z."
- **Especially required when the load-bearing capability is a security property** (gated access, signed URLs, encryption-at-rest, etc.) or a correctness property (transactional guarantees, atomicity, ordering).
- **If you can't write the citation, you can't accept the ADR.** Either the capability exists and you find the proof, or it doesn't and the design needs to change.
- **Wrappers lag underlying tools.** A library may add a feature its framework plugin hasn't exposed yet. The underlying SDK's docs are not a proof that the plugin you use can reach the feature. Always verify at the plugin layer, not the SDK layer.

**Why this rule exists:** ADR 002 (two Vercel Blob stores) was designed around URL-level access enforcement via signed URLs from a private-typed store. The plugin `@payloadcms/storage-vercel-blob` types `access?: 'public'` only — verified after the fact by reading `node_modules/@payloadcms/storage-vercel-blob/dist/index.d.ts:10`. Five minutes of source-reading at ADR time would have surfaced it; instead the gap shipped, a production deploy errored on the private-typed store, and a layer's worth of correction work followed. Captured as engineering principle #14 ("Verify the wrapper exposes the capability before designing around it") — this rule is the process-side enforcement of that principle.

## Third-party plugin discovery + capability comparison at brainstorm start

When brainstorming a feature that integrates with a third-party service, **before scoping any design or behavior**, the agent must:

1. **Search the framework's plugin directory for that vendor.** Common locations:
   - Payload: `https://payloadcms.com/docs/plugins/`
   - Next.js: `https://nextjs.org/docs` plugins section, or `node_modules/next/dist/docs/`
   - Generic Node ecosystem: npm search for `@<framework>/plugin-<vendor>` or equivalent
   - Also check `docs/reference/documentations/` for any in-repo summary of the vendor's plugin or SDK
2. **If a plugin exists, inventory its documented capabilities** — auto-installed hooks, schema fields added, webhook handling, REST proxying, sync direction, field-mapping shape, what's explicitly out of scope, **the plugin's SDK peer-dependency version**, and **the wire-protocol version the plugin hardcodes** (if applicable, e.g. `apiVersion` for Stripe-style SDKs) — and present them as a table or list in the brainstorm
3. **Compare the plugin's capabilities point-by-point to the integration's requirement** *before* proposing any design or behavior
4. **The choice (adopt vs build) is made only after the comparison.** Adopt the plugin when its capabilities cover the requirement; build from scratch only when they don't, recording which specific gap forced the bespoke path
5. **Behavior brainstorming starts after the choice, not before**

**Shared-dependency version compatibility — a required comparison, not an afterthought.** Beyond the plugin's own API, compare the plugin's declared version of every library you *also* depend on directly — schema/validation libraries especially — against your project's version. A major-version split makes objects non-interchangeable at the integration seam in **both** type and runtime, even though each side compiles in isolation, because a major bump changes a value's internal structure. **Concretely in this project: zod v3 and zod v4 are NOT interchangeable.** The app pins zod v4; `@payloadcms/plugin-mcp` pins zod v3 and types its custom-tool `parameters` as a v3 `ZodRawShape` — a v4 schema fails that type (`TS2322`) and the v3-based MCP SDK rejects it at runtime. Author boundary schemas with the version the plugin consumes (zod v4 ships a `zod/v3` compat subpath for exactly this), bridge the cross-instance *type* gap with one narrow cast at the registration seam, and **verify the seam with a real runtime call — a passing `tsc` does not prove the consumer accepts the object.** Full incident in `docs/reference/execution/agent-mistakes.md` (custom MCP tool authored with zod v4 against a zod-v3 plugin); the abstract form is the "audit shared-dependency versions across an integration boundary" engineering principle.

**Inventory the vendor's object model, not just the plugin's capabilities** (this applies even when there is *no* plugin — a raw API integration too). Beyond "what does the plugin expose," list the vendor's relevant **objects** (its customers, events, intents, webhooks, identities — whatever it models) and present a table: *vendor object | our usage | in-scope / deferred-with-reason / N-A*. The deferrals become first-class, revisitable decisions instead of silent omissions — absence in the design should be a *choice*, not an oversight (engineering principles "inventory a vendor's object model before scoping" + "capture schema-coupled external identity at creation"). The most expensive gaps are the schema-coupled ones (an external id, a consent flag) that are cheap at row-creation and impossible to backfill — surface those in the table especially.

Plugin existence alone is not a decision. The comparison is. Skipping the comparison — or treating absence as scope clarity when it's really unsurfaced ambiguity — is the specific failure mode this rule guards against.

**Why this rule exists:** When designing this project's Stripe integration, an early brainstorm proposed building custom sync hooks, schema fields, idempotency, and retry behavior from scratch — without first checking that `@payloadcms/plugin-stripe` already covers most of that surface. Five minutes of plugin-directory search at the start would have reframed the brainstorm from "build from scratch" to "compare plugin capabilities to requirement." Without an explicit first-step rule, even an agent that knows about plugins in principle can skip the check when the user's framing presumes a from-scratch design — and an agent that finds a plugin can fall into the symmetric trap of adopting it without checking the capability fit. The discipline is in the comparison, not the existence check.

## Skipping interactive setup — always verify against current docs

When you skip an interactive setup tool (CLI wizard, framework init command, scaffolding utility) and write the equivalent configuration manually, **fetch the current official documentation first** and verify your manual setup matches what the wizard would have generated. Do not write the config from memory or from older examples.

- **Why:** wizards encode the *current* convention. Bypassing them and writing from memory pulls in whatever was current the last time you saw that tool — often deprecated, renamed, or replaced since. The convention is a moving target; the wizard tracks it, your memory doesn't.
- **Required when substituting a wizard:**
  1. State explicitly in your message that you're skipping the wizard
  2. WebFetch the official setup docs for the current version of the tool
  3. Compare what the docs prescribe vs what you were about to write
  4. Apply the docs-current version, not the from-memory version
  5. Surface any deliberate deviations from the docs (e.g., "skipping replay integration for MVP") so the human can sanity-check
- **Applies to:** Sentry wizard, framework init commands (e.g. `create-next-app`, Payload CLI), scaffolding scripts (Stripe CLI generators), IDE-driven setup, any tool whose normal entry point is a series of prompts.

**Why this rule exists:** Layer 3 Sentry setup was done manually (no wizard, since wizard prompts can't be subagent-driven). The first attempt used `sentry.client.config.ts` (the v9.x file name) and `disableLogger: true` (deprecated in v10.x). Build emitted a deprecation warning every run. WebFetch against the official manual-setup docs surfaced both issues immediately — the correct filename is `instrumentation-client.ts` and `disableLogger` was removed in favor of `silent: !process.env.CI` + `widenClientFileUpload: true`. Five minutes of doc-reading at setup time would have caught both; instead they shipped in a commit and required a follow-up `fix(layer3)` commit to align.

## Read the third-party API reference before implementing against a parameter or endpoint

Before writing code that calls a third-party API — setting a specific parameter, calling a specific endpoint, designing an idempotency/retry/pagination strategy — read that vendor's **API reference** for the exact parameter or endpoint, not just a how-to guide. Guides narrate a happy path; the reference states the hard constraints (which mode a parameter is valid in, what gets cached, what errors when, rate limits, required-together fields). When behavior depends on context (mode, plan, object type), only the reference is authoritative.

- **Required before the call ships:**
  1. Open the vendor's API reference for the specific parameter/endpoint (not a tutorial, not a blog, not memory).
  2. Read the parameter's constraints: which modes/contexts it's valid in, defaults, mutually-exclusive or required-together fields, caching/idempotency behavior, error conditions.
  3. If the feature is load-bearing (payments, auth, data integrity), cite the reference URL + the constraint sentence in a code comment or the PR.
  4. Test the call against the real vendor (sandbox/test mode) before claiming it works — a docs reading is a hypothesis, not a verification.
- **Guides vs reference:** a guide answers "how do I do X in the common case." The reference answers "exactly what does this parameter do and when does it error." For anything beyond the common case, the reference is the source of truth.
- **Applies to:** Stripe, and any vendor API — Twilio, Resend, AWS, Vercel, Upstash, etc.

**Why this rule exists:** two same-day incidents (2026-05-27, both in `agent-mistakes.md`). (1) `payment_method_collection: 'if_required'` was set on a one-time Checkout Session based on reading Stripe's no-cost-orders *guide* (which describes the subscription flow); the API *reference* states the parameter is `subscription`-mode only, and Stripe returned 400 on every checkout — paid and free — until it was removed. (2) Idempotency keys were designed from intuition (stable `publicId`-based keys) without reading Stripe's idempotency reference, whose one load-bearing sentence — "saves the result regardless of whether it succeeds or fails, including 500 errors" — meant stable keys cached failures for 24h and locked on param mismatches. Both were a guide-vs-reference gap; both shipped before the first real test. Reading the reference for the specific parameter, and testing against Stripe test mode before declaring done, would have caught both.

## Verify the consuming CLIENT's requirements, not just the server library's capabilities

When building a server or integration that a specific client will consume (an MCP server for Claude.ai, a webhook a vendor will call, an OAuth provider an app will connect to, an API a mobile app will hit), the **client's connection + auth contract is as load-bearing as the server library's API.** Read the client's requirements *before* designing the server's auth/transport — not after building it.

- **Required before designing the server's auth/transport:**
  1. Find the consuming client's docs for *how it connects* and *what auth it accepts* (auth schemes, grant types, required metadata/endpoints, redirect URIs, transport, payload limits).
  2. Confirm the auth model you're about to build is one the client actually supports. "The server library supports auth X" does NOT mean "the client accepts auth X."
  3. If the client mandates a flow (OAuth with user consent, specific discovery endpoints), design to that from the start rather than retrofitting.
- **Applies to:** MCP servers (Claude.ai / Claude Desktop / Claude Code each have different connection contracts), webhook producers, OAuth integrations, any server whose whole purpose is to be called by a known client.

**Why this rule exists:** the MCP server was built with static per-agent bearer-token auth, verified thoroughly against the *server library* (mcp-handler) — but the *intended client* (Claude.ai, named in `architecture.md`) was never checked. Claude.ai's Custom Connectors require an OAuth 2.1 flow with user consent on every connection: a user-pasted static bearer is unsupported, and a no-user `client_credentials` grant is unsupported (so a headless agent can't connect via Claude.ai at all). Static bearer turned out to work only for the *separate* Claude Code `--header` / `mcp-remote` path. Reading Claude.ai's connector-auth docs first would have surfaced that OAuth was required for the primary target before the whole static-bearer system was built. Full detail in `agent-mistakes.md` #18. This is the client-side companion to the "read the third-party API reference" rule above.

## Squash-merge to `main` requires a confirmed preview/staging deploy

Before squash-merging any layer/branch PR to `main`, the change must be confirmed working on a **real preview/staging deployment** (Vercel preview for the PR, or the staging environment) — not just locally and not just green CI. Local dev and CI do not exercise the production runtime (the deployed serverless functions, the real OAuth client, the production DB schema, the dashboard-configured env), so a class of bugs only surfaces there.

- **When the operator asks to squash-merge, the agent MUST first prompt:** "Has this been confirmed working on the Vercel preview / staging deployment?" — and not proceed with the merge until the operator confirms.
- This is a hard gate on the merge step, in addition to green CI and local verification.

**Why this rule exists:** an MCP OAuth agent-provisioning bug (a name derived from a truncated WorkOS id collided across operators, and concurrent first-connects raced) reached `main` and only manifested in production against the real Claude.ai OAuth client — CI and local never connected a real client. A preview-deploy check with one real connection would have caught it before the merge.

## Verify a CI action's latest version before pinning it

When adding or pinning a GitHub Actions step (`uses: owner/repo@vN`) — or any external CI action — verify the **current** latest major from the source before writing the version. Do not assume it from memory, and do not copy a version out of an old workflow or template (it may be stale).

- **Check the real latest:** `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name` (or the action's Releases page). Pin to the latest major's floating tag (e.g. `@v6`).
- **Confirm the ref actually resolves:** `gh api repos/<owner>/<repo>/git/ref/tags/v6` — a stale assumption can pin a major that doesn't exist (the step then fails to resolve at run time). The most-recent-tags list alone isn't proof a floating `vN` tag exists; check the ref.
- **An IDE/editor's action-version warning is NOT authoritative** — its cache lags the registry. Verify against the GitHub API before trusting *or* dismissing it.
- **Keep workflows consistent:** when one workflow advances an action's major, advance the others in the same change so they don't drift.

**Why this rule exists:** a test workflow was pinned to `actions/checkout@v4` / `pnpm/action-setup@v4` / `setup-node@v4` from memory while the repo's other workflow already used `@v6` — the actual latest major for all three. An assumed/stale version silently runs on an outdated action (missing fixes, heading for deprecation), and copying versions between workflows propagates the staleness. One API check at write time avoids it.
