# Themeable storefront — design

**Date:** 2026-06-03
**Status:** approved (brainstorm); plan TBD
**Audience target:** the "Digital AI Sharing" internal demo

## 1. Context

Today this repo exposes a `Products` collection over MCP with bulk create/update tools and a draft-on-write hook. The visible site is a placeholder `<ul>` listing published products — not something an audience would react to.

The demo this design serves is **"Pop-up shop in a box"**: a themeable micro-storefront where one Claude prompt can rebrand the entire site — palette, typography, copy, and catalog — by calling a small set of MCP tools. Re-prompt with a different niche, watch the same site become something visually unrelated.

This spec covers the **collections, theme application, block library, seed, and MCP tool surface** to make that demo work. It does NOT cover deploys, observability, or the WorkOS OAuth path (already documented in the README).

## 2. Goals / non-goals

**Goals**
- The MCP server can fully rebrand the site by writing to **`SiteSettings`** (theme tokens) and **`Pages.sections`** (composed blocks), plus the existing `Products` mutations.
- The frontend re-renders the new brand on the next Next.js fetch (drafts honored when `?draft=true` or when the user is an admin — see §6).
- Default seed is a **neutral demo template** (warm grays + one accent) — not pre-themed as a niche. The rebrand reveal is more compelling against a neutral baseline.
- The schema reads naturally to an LLM. Field names (`brandName`, `palette.accent`, `typography.heading`) are what Claude will guess on first try.

**Non-goals**
- No multi-page navigation, no header/menu collection. One `home` Page is enough for the demo.
- No image uploads / media collection (would force a storage adapter — out of scope). Blocks reference no images; Hero leans on typography + color.
- No A/B testing, scheduling, or i18n.
- No Tailwind. Theme switching is plain CSS variables driven by `SiteSettings`. (Tailwind palette changes require regenerating config — kills the live-rebrand demo story.)

## 3. Schema

### 3.1 `SiteSettings` (global, singleton, drafts on, MCP-writable)

Fields:

| Field | Type | Notes |
|---|---|---|
| `brandName` | text, required | "Ember & Oat" |
| `tagline` | text | One-line hero subhead default |
| `vibe` | textarea | Free-text descriptor Claude can read back when iterating ("warm, artisanal, slow") |
| `palette` | group |  |
| ↳ `bg`, `surface`, `text`, `muted`, `accent`, `accentText` | text (hex, validated) | All required, format `#rrggbb` |
| `typography` | group |  |
| ↳ `heading` | select | `sans` \| `serif` \| `display` \| `mono`. Maps to a Google Fonts pick via `next/font` |
| ↳ `body` | select | same options |
| `radius` | select | `sharp` (0) \| `soft` (6px) \| `rounded` (14px) |
| `density` | select | `tight` \| `standard` \| `airy` — drives a spacing scale |

Access: read public; write `isAdminOrMcpAgent`. Draft-on-MCP-write via the existing hook so admin can review/publish.

### 3.2 `Pages` (collection, drafts on, MCP-writable)

Fields:

| Field | Type | Notes |
|---|---|---|
| `slug` | text, unique, indexed | `home` for the demo seed |
| `title` | text | Admin label |
| `sections` | blocks array | Ordered. Block types listed in §3.3 |

Access: read public-for-published; write `isAdminOrMcpAgent`. Same draft-on-write hook.

### 3.3 Block library (`Pages.sections` block types)

Each block is a Payload `block` config with `slug` matching the type name below.

- **`hero`** — `eyebrow?` (text), `heading` (text, required), `subheading?` (text), `primaryCta` (group: `label`, `href`).
- **`featuredProducts`** — `heading?` (text), `limit` (number, 1–12, default 4), `category?` (select with the existing `PRODUCT_CATEGORY_OPTIONS` plus an "all" sentinel).
- **`richText`** — `heading?` (text), `body` (richText / Lexical). No `bodyMd` markdown sidecar in this scope (the existing `markdownToLexical` hook lives on `Products` and would need generalizing to walk `Pages.sections` blocks — deferred; see §10). For the demo, MCP either writes Lexical JSON directly or uses a `cta`/`hero` block instead.
- **`cta`** — `heading` (text), `body?` (text), `ctaLabel` (text), `ctaHref` (text).
- **`footer`** — `copy?` (text), `links` (array of `{label, href}`).

### 3.4 `Products`

No schema change. (Already supports the demo.)

## 4. Theme application

- Root `(frontend)/layout.tsx` fetches `SiteSettings` once per request.
- Layout emits CSS variables on `<html>`:
  - Colors → `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--accent-text`
  - Radius → `--radius-sm`, `--radius-md`, `--radius-lg` (derived from the `radius` select; one base value, three rungs)
  - Density → `--space-1` … `--space-6` (derived from the `density` select)
  - Fonts → `--font-heading`, `--font-body` (CSS variables exposed by `next/font`)
- A small `globals.css` defines base element styles using only those vars (e.g. `body { background: var(--bg); color: var(--text); font-family: var(--font-body); }`).
- Block components import per-block CSS Modules that also read those vars. No hardcoded colors in components; every color/space/radius reference is a var.
- `next/font/google` loads four families at build time and the `typography.heading` / `typography.body` selects map to the right CSS variable:
  - `sans` → **Inter**
  - `serif` → **Lora**
  - `display` → **Playfair Display**
  - `mono` → **JetBrains Mono**

**Consequence:** updating any `SiteSettings` field, on the next render, propagates through every block with zero rebuild. That's the rebrand-via-prompt mechanic.

## 5. Block rendering

- `app/(frontend)/[[...slug]]/page.tsx` (catch-all):
  - If no slug → render the `home` page.
  - If slug present → fetch the matching `Pages` row.
  - Map `sections[].blockType` → a React component (`HeroSection`, `FeaturedProductsSection`, …).
  - `FeaturedProductsSection` queries the `products` collection server-side honoring `limit` and `category` filter.
- Block component files live in `app/(frontend)/_blocks/` (the leading underscore keeps Next from treating them as routes). One component per block, one CSS Module per block.
- Section renderer is a small switch (`renderSection(section)`); unknown `blockType` returns `null` (so adding a new block in the future doesn't crash old pages).

## 6. Draft handling

- Default fetch: published only (matches the existing access rule).
- Admin detection: the frontend route uses Payload's `headers()` + `payload.auth({ headers })` to check for an authenticated admin session. If admin → fetch with `draft: true` + `overrideAccess: false`; if not → published only.
- Effect: a reviewer logged into `/admin` opens `/` in the same browser and sees the latest MCP-authored drafts. Logged-out visitors see only what's been explicitly published.
- No tokenized public preview links — out of scope.

## 7. Seed

A `pnpm seed` script (one-off, idempotent — checks-then-inserts):

- One `SiteSettings` row with the **neutral demo template**:
  - `brandName: "your storefront"`, `tagline: "your tagline goes here"`, `vibe: "neutral starting point — ready to be rebranded"`
  - palette: `bg #fafaf9`, `surface #ffffff`, `text #1c1917`, `muted #78716c`, `accent #0d9488`, `accentText #ffffff`
  - typography: `heading: sans`, `body: sans`; `radius: soft`; `density: standard`
- One `Pages` row with `slug: home`, `title: "Home"`, sections: Hero / FeaturedProducts (limit 4, all) / CTA / Footer — all with placeholder copy.
- Six placeholder `Products` across the existing categories so `FeaturedProducts` renders something nontrivial.

The seed publishes all rows (so a fresh clone shows a styled site immediately). MCP-driven changes thereafter land as drafts.

## 8. MCP tool surface

- **Auto-generated by `@payloadcms/plugin-mcp`:**
  - `findProducts`, `createProducts`, `updateProducts` (already on)
  - `findPages`, `createPages`, `updatePages` (new — turn on `pages` in the plugin config)
- **Custom (already exist):** `createManyProducts`, `updateManyProducts`
- **New custom — `updateSiteSettings`:** singleton writer. Takes a partial `SiteSettings` patch (Zod schema mirroring the collection), applies via `payload.updateGlobal`. Lands as draft (forced by the draft hook). Off by default on new API keys; tick to enable.

That's it. Three tool calls cover the rebrand prompt: `updateSiteSettings` (theme + brand) + `updatePages` (replace `home.sections`) + `createManyProducts` (catalog refresh).

## 9. Verification (acceptance criteria)

- [ ] Fresh `pnpm seed` produces a styled site at `/` with hero, 4 featured products, CTA, and footer.
- [ ] Manually changing any `SiteSettings` palette field in the admin and republishing visibly changes the site on next refresh — no rebuild needed.
- [ ] An MCP client, with the right tools ticked, can: (a) call `updateSiteSettings` to swap the palette + typography + brandName; (b) call `updatePages` to replace the `home` page's sections; (c) call `createManyProducts` to replace the catalog. The resulting changes are drafts visible to admins.
- [ ] Admin sees drafts on the public site; logged-out visitors see only published content.
- [ ] All theme tokens render — no hardcoded color/space/radius/font in any block component (grep-able).

## 10. Out of scope (deferred)

- Image upload / Media collection / `Hero.backgroundImage`.
- Multi-page navigation, header/menu collection.
- Per-section visibility toggles, A/B variants, scheduling.
- A real "publish all drafts" MCP tool (for the demo, a human admin clicks publish — that's part of the safety-rail beat).
- Light/dark mode token sets — single palette per `SiteSettings` row is enough.
- Generalizing the `markdownToLexical` hook to walk `Pages.sections` so blocks accept a `bodyMd` sidecar (needed if/when the `richText` block becomes the main authoring surface for MCP).

## 11. Open decisions

None blocking. Tailwind-vs-CSS-vars resolved (CSS vars). Seed niche resolved (neutral template). Block list resolved (5 blocks).
