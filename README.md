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
| WorkOS OAuth for Claude.ai web | ✅ wiring in place; needs WorkOS dashboard config to use |

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

## Connect from Claude.ai web (WorkOS OAuth)

**Scope:** this section is **only** for the Claude.ai web Custom Connector path. Claude.ai web requires an OAuth 2.1 flow with user consent — it cannot accept a pasted static API key. For local clients (Claude Code via `--header`, `mcp-remote`), the static API-key flow in [Setup](#setup) is all you need; skip this section.

This demo uses [**WorkOS AuthKit**](https://workos.com/docs/authkit/mcp) as the OAuth authorization server. The MCP server is the resource server: it validates AuthKit-issued JWTs on the way in and auto-provisions a corresponding `mcp-agents` row on first connect.

### 1. WorkOS dashboard — one-time

In the [WorkOS Dashboard](https://dashboard.workos.com/):

1. **Create an AuthKit project** if you haven't. Note its issuer domain (e.g. `https://your-project.authkit.app`).
2. **Register this MCP server as a Resource Indicator** (AuthKit → MCP / Resource Servers). The value MUST be the deployed URL of `/api/mcp`, exact match:
   - Local dev: `http://localhost:3000/api/mcp`
   - Deployed: `https://<your-deploy>/api/mcp`
3. **Configure the AuthKit redirect URI** to match what Claude.ai web will use (Claude.ai handles the redirect; AuthKit just needs to whitelist it). Follow the [WorkOS MCP guide](https://workos.com/docs/authkit/mcp) for the current redirect URI Claude.ai sends.
4. **Grab three values** for `.env.local`:
   - `WORKOS_CLIENT_ID` — Dashboard → Applications → your app → Client ID (`client_...`). Public/public-ish.
   - `WORKOS_API_KEY` — Dashboard → API Keys → reveal secret (`sk_...`). **Secret** — server-side only, never `NEXT_PUBLIC_*`.
   - `WORKOS_AUTHKIT_DOMAIN` — Dashboard → AuthKit → your project's domain. **Format:** the dashboard shows a bare host like `your-project.authkit.app`; you MUST prepend `https://` and use no trailing slash (the JWKS fetch concatenates `${domain}/oauth2/jwks` — a missing scheme breaks it silently).

   And:
   - `NEXT_PUBLIC_SITE_URL` — the origin where this app is reachable (e.g. `https://your-deploy.vercel.app`). The MCP audience the server validates against is `${NEXT_PUBLIC_SITE_URL}/api/mcp` — it MUST match the Resource Indicator you registered above, byte-for-byte (no trailing slash, scheme included).

**Sanity check** the AuthKit domain before wiring further:

```bash
curl -fsS "$WORKOS_AUTHKIT_DOMAIN/oauth2/jwks" | jq .keys[0].kty
# → "RSA" (or similar). A 404 or HTML body means the domain is wrong.
```

### 2. Add the connector in Claude.ai web

In Claude.ai → Settings → Custom Connectors → **Add custom connector**:

- **Server URL:** `${NEXT_PUBLIC_SITE_URL}/api/mcp` (the same string you used as the Resource Indicator).
- Claude.ai discovers the OAuth flow via the server's `/.well-known/oauth-protected-resource` metadata, redirects to AuthKit, the user grants consent, AuthKit returns an audience-bound JWT, Claude.ai presents it to `/api/mcp` as a bearer token.

### 3. First connect → auto-provisioned agent

On the first successful connect for a given WorkOS user:

- The server validates the JWT (issuer = AuthKit domain, audience = `/api/mcp` URL) against the AuthKit JWKS.
- It looks up an existing `mcp-agents` row by `workosUserId` (the token `sub`); if none, it **auto-creates one** as `active: true`. The agent name is deterministic (`oauth-<26-char ULID>`) so concurrent first-connects collide idempotently.
- The row gets the content surface (`products` find/create/update + both bulk tools) for the duration of that request.

To **revoke** an OAuth agent: admin → MCP Agents → untick the row's `active` checkbox. The agent is denied at its next connect (existing in-flight requests are not interrupted).

### What's different from the static-key path

| | Static API key | WorkOS OAuth |
|---|---|---|
| Clients | Claude Code, `mcp-remote` | Claude.ai web |
| Provisioning | Admin creates an `mcp-agents` row + mints an API key | Auto-created on first OAuth connect |
| Credential | Long-lived bearer token | Short-lived audience-bound JWT |
| Revocation | Delete the API key | Untick `active` on the agent row |
| Env vars needed | none beyond Setup | `WORKOS_*` + `NEXT_PUBLIC_SITE_URL` |

Both paths can run side-by-side — the `overrideAuth` callback tries WorkOS first, then falls back to the plugin's per-API-key auth.

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
