# claude ai mcp demo

> **Pop-up shop in a box.** A themeable micro-storefront that Claude can rebrand and restock end-to-end through MCP — same site, swappable identity. "Make this an artisanal coffee roaster" → palette, fonts, hero, and product list all flip live. Then "actually, make it a vintage record store" → it flips again.

Built to show, at internal demos like Digital AI Sharing, that an MCP server can drive a website's **content AND its look-and-feel** — not just CRUD a row in a CMS.

## What it shows

- **Content control** — Products collection exposed over the official [`@payloadcms/plugin-mcp`](https://www.npmjs.com/package/@payloadcms/plugin-mcp), plus bulk tools (`createManyProducts`, `updateManyProducts`) with per-item transactions and partial success.
- **Look-and-feel control** *(planned, see Status)* — `SiteSettings` for theme tokens (palette, typography, brand) and `Pages`/`Sections` for hero/featured/footer blocks — all writable over MCP.
- **Safety rails** — every MCP write lands as a **draft** (`forceDraftForMcpWrites` hook) so a human can review before publish. MCP identity is a non-admin `mcp-agents` row, not a human admin.
- **Two connection paths** — paste a static API key (Claude Code, `mcp-remote`) OR connect via OAuth from Claude.ai web (WorkOS AuthKit as the authorization server).

## Status

| Capability | State |
|---|---|
| `products` collection over MCP | ✅ working |
| Bulk create/update tools with draft-on-write | ✅ working |
| `mcp-agents` non-admin identity + per-key tool gating | ✅ working |
| Themeable storefront frontend | 🚧 placeholder page only |
| `SiteSettings` theme tokens | 🚧 not yet |
| `Pages` / `Sections` block library | 🚧 not yet |
| WorkOS OAuth for Claude.ai web | 🚧 env scaffolded, wiring WIP |

The themeable frontend and the site-config collections are the next chunk of work — that's the headline demo moment.

## Setup

```bash
docker compose up -d                 # local Postgres on :5432
pnpm install
cp .env.example .env.local
# fill in PAYLOAD_SECRET — `openssl rand -hex 32`
# (WorkOS vars only needed for the Claude.ai web OAuth path)
pnpm dev
```

Open <http://localhost:3000/admin>, create the first admin, then:

1. Create an `mcp-agents` row (admin → MCP Agents).
2. Create an MCP API key (admin → MCP API Keys) bound to that agent.
3. Tick the `createManyProducts` / `updateManyProducts` checkboxes on the API-key row (custom tools are off-by-default).
4. Connect from an MCP client to `http://localhost:3000/api/mcp` with the API key as a bearer token.

> Migrating from the older `mcp-products-demo` setup? The DB was renamed (`mcp_products_demo` → `claude_ai_mcp_demo`). Run `docker compose down -v` to nuke the old volume, then `docker compose up -d` for a fresh DB.

## The demo moment (target)

Once the themeable frontend lands, the showcase prompt is something like:

> "Rebrand this site as **Ember & Oat**, a small-batch coffee roaster. Warm earth-tone palette, serif headings, friendlier copy. Replace the products with 5 single-origin beans, prices $18–24, with tasting-note descriptions."

Claude calls a handful of MCP tools (update `SiteSettings`, replace `Sections`, bulk-create `Products`), the dev server picks up the drafts on next reload, the site is a coffee shop. Re-prompt with a different niche → it's something else.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Payload CMS 3.85** with Postgres adapter
- **`@payloadcms/plugin-mcp`** — Streamable HTTP at `/api/mcp`
- **WorkOS AuthKit** *(optional)* — OAuth authorization server for Claude.ai web connections
- **pnpm** + **Docker Compose** for local Postgres

## Layout

```
app/
  (frontend)/        # public site — themeable storefront (WIP)
  (payload)/         # admin UI + /api/mcp endpoint
collections/         # Admins, MCPAgents, Products (+ SiteSettings/Pages soon)
lib/
  mcp-tools.ts       # createManyProducts, updateManyProducts
  categories.ts
payload.config.ts    # plugin wiring, MCP_ENABLED kill switch
```
