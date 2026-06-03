# Local development setup

Step-by-step to get the demo running on a fresh machine. By the end you can sign in to the admin panel, list and create products over MCP, and (optionally) connect from Claude.ai web via OAuth.

---

## What you need before you start

- **Node.js 22.15+** and **pnpm 10+**. (`node -v` and `pnpm -v` confirm.)
- **Docker** running locally — used for Postgres.
- **A WorkOS AuthKit account** *(optional)* — only needed for the Claude.ai-web Custom Connector path. Skip if you only want to connect from Claude Code, `mcp-remote`, or other clients that accept a pasted bearer token.

If you don't have a WorkOS account and only want to exercise the admin panel + static-API-key MCP, skip those env vars — the app boots without them.

---

## 1. Install dependencies

```bash
pnpm install
```

Installs Payload, Next.js, the MCP plugin, and everything else. First install takes a few minutes; subsequent installs are fast.

---

## 2. Start the Postgres container

```bash
docker compose up -d
```

Boots `postgres:16-alpine` on port 5432 (database `claude_ai_mcp_demo`, user/pass `postgres`/`postgres`). The data volume persists between container restarts. To wipe local data and start clean:

```bash
docker compose down -v
docker compose up -d
```

Verify it's up:

```bash
pg_isready -h 127.0.0.1 -p 5432
# 127.0.0.1:5432 - accepting connections
```

---

## 3. Create your `.env.local`

```bash
cp .env.example .env.local
```

Minimum-viable values to boot the app:

| Var | What it is | How to get it |
|---|---|---|
| `PAYLOAD_SECRET` | random string for signing JWTs | `openssl rand -hex 32` |
| `DATABASE_URL` | Postgres connection string | Already set to the Docker container's URL — leave it |
| `MCP_ENABLED` | kill switch for the MCP endpoint | `true` to expose `/api/mcp`; anything else and the plugin registers nothing |

Optional, only for the **Claude.ai-web OAuth path** (full setup in [`README.md`](../README.md#connect-from-claudeai-web-workos-oauth)):

| Var | What it is | How to get it |
|---|---|---|
| `WORKOS_CLIENT_ID` | AuthKit application client id (`client_...`) | WorkOS Dashboard → Applications → your app → Client ID |
| `WORKOS_API_KEY` | AuthKit secret key (`sk_...`) — server-side only | WorkOS Dashboard → API Keys → reveal Secret Key |
| `WORKOS_AUTHKIT_DOMAIN` | AuthKit issuer domain | WorkOS Dashboard → AuthKit. **Format:** prepend `https://`, no trailing slash → `https://your-project.authkit.app` |
| `NEXT_PUBLIC_SITE_URL` | the origin this app is reachable at | `http://localhost:3000` locally; the deployed URL otherwise. Must byte-match the Resource Indicator registered in the WorkOS Dashboard |

`.env.local` is git-ignored. When you add a new env var, mirror it (with a placeholder value) in `.env.example` so the next developer's setup doesn't break — this is in `CLAUDE.md` as a workflow rule.

---

## 4. Apply database migrations

```bash
pnpm migrate
```

Applies every migration in `migrations/` to the local DB in order. Payload may prompt "data loss may occur" — that's a generic safety prompt, not a description of any specific migration. For a fresh DB with no rows, there's nothing to lose; answer `yes`.

To roll back:

```bash
pnpm payload migrate:down              # rolls back ONE migration
pnpm payload migrate:fresh             # drops everything and re-runs all migrations
```

---

## 5. Start the dev server

```bash
pnpm dev
```

Runs `next dev --no-server-fast-refresh`. The flag works around a Turbopack quirk that prevents Payload admin CSS from loading in multi-root-layout setups. Server is at <http://localhost:3000>.

---

## 6. Smoke-test the golden paths

### Admin panel

1. Open <http://localhost:3000/admin>
2. On first boot, Payload asks you to create the initial admin. Use any email/password you'll remember.
3. Browse **MCP Agents**, **MCP API Keys**, **Products**. All three should be empty.

### Create an MCP agent + API key

1. Admin → **MCP Agents → Create New**. Pick a slug-style name like `local-bot` (lowercase letters/digits/hyphens; starts with a letter; max 32 chars). Save.
2. Admin → **MCP API Keys → Create New**. Bind it to the agent you just created. The per-tool capability checkboxes (Find / Create / Update + the custom bulk tools) are **on by default** in this demo — untick anything you want to restrict. Save.
3. **Reveal the key** once on the next screen and copy it — it's only shown at creation time.

### Hit the MCP endpoint

Prereqs: `MCP_ENABLED=true` in `.env.local`, the dev server running, the API key from above. The endpoint is `/api/mcp` (single Streamable-HTTP, no `/sse`); the key is a **Bearer** token. Two header requirements: `Accept: application/json, text/event-stream` (the endpoint returns 406 otherwise) and `Authorization: Bearer <key>`.

```bash
KEY=<your-mcp-api-key>
BASE=http://localhost:3000/api/mcp
H=(-H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream")

# Auth gate — no key → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# List tools — expect the plugin's auto-generated tools for `products`
# (findProducts, createProducts, updateProducts) PLUS the two custom bulk
# tools (createManyProducts, updateManyProducts). No delete.
curl -s -X POST $BASE "${H[@]}" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | sed 's/^data: //'

# Read
curl -s -X POST $BASE "${H[@]}" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"findProducts","arguments":{"limit":3}}}' | sed 's/^data: //'

# Create — lands as DRAFT; content authored in markdown via contentMd → converted to Lexical
curl -s -X POST $BASE "${H[@]}" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"createProducts","arguments":{"publicId":"'"$(cat /proc/sys/kernel/random/uuid)"'","slug":"mcp-test","title":"MCP Test","price":9.99,"category":"cheatsheet","contentMd":"Body text."}}}' | sed 's/^data: //'
```

Verify the create response shows `"_status":"draft"`, `"contentMd":null` (cleared after conversion), and `"content":{...Lexical node tree...}`. The product is a draft — it won't appear on the public site until a human publishes it.

**Plugin rough edges:**

- `createProducts` requires `publicId` **and** `slug` in the arguments even though both auto-populate in the collection config — the plugin's generated input schema honors `required: true` but not `defaultValue`/hooks. Pass any UUID for `publicId` and any string for `slug` (the `generateSlug` hook may overwrite the slug).
- MCP writes are attributed to the API key's backing **`mcp-agents` identity** — never to a human admin.

### (Optional) Connect from Claude.ai web

Requires WorkOS env vars set + AuthKit dashboard configured per [`README.md`](../README.md#connect-from-claudeai-web-workos-oauth). In Claude.ai → Settings → Custom Connectors → Add custom connector → Server URL = `${NEXT_PUBLIC_SITE_URL}/api/mcp`. The first successful OAuth connect auto-creates an `mcp-agents` row keyed on the WorkOS user id; untick `active` on that row to revoke.

---

## 7. Common workflows after initial setup

### Schema change

1. Edit a collection config under `collections/`
2. `pnpm migrate:create <table>_<operation>` — name the migration by the table + operation it performs (e.g. `products_add_archived_at`), not by a generic label
3. Hand-edit the generated migration: add backfill steps before any `NOT NULL` promotion, so existing rows don't violate the new constraint
4. `pnpm migrate` to apply
5. `pnpm generate:types` to refresh `payload-types.ts`
6. `pnpm exec tsc --noEmit` to confirm nothing broke

### After pulling new code

```bash
pnpm install                  # if dependencies changed
pnpm migrate                  # if new migrations
diff .env.local .env.example  # if new env vars needed
pnpm generate:types           # types may have changed
```

### Resetting local data

```bash
docker compose down -v && docker compose up -d
pnpm migrate
```

---

## Troubleshooting

- **`pnpm dev` errors with "Missing required env var: X"** — `requireEnv()` in `payload.config.ts` fails fast on missing required tokens at boot. Fill in the var and restart.
- **Migration says "data loss may occur"** — generic Payload safety prompt, not a description of the specific migration. For a non-destructive migration (rename, additive column) on a fresh DB, answer `yes` safely.
- **Admin panel CSS doesn't load** — already worked around with `--no-server-fast-refresh` in the `dev` script. If you removed that flag, restore it.
- **MCP `/api/mcp` returns 404** — `MCP_ENABLED` isn't `true` in `.env.local` (or you restarted the dev server before setting it).
- **MCP `/api/mcp` returns 406** — missing `Accept: application/json, text/event-stream` header on the request.
- **MCP `/api/mcp` returns 401 with a valid-looking key** — the key was created but the API-key row's per-tool capabilities (or the `enableAPIKey` checkbox) were unticked on save. Check the row in admin → MCP API Keys.
