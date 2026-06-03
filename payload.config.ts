import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { Admins } from './collections/Admins'
import { MCPAgents } from './collections/MCPAgents'
import { Products } from './collections/Products'
import { createManyProductsTool, updateManyProductsTool } from './lib/mcp-tools'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Fail fast on missing required env vars. Without this, an unset DATABASE_URL
// silently becomes the empty string and pg-pool falls back to its
// localhost:5432 default — producing a runtime ECONNREFUSED on the first
// request. Throwing here surfaces the real problem at process start.
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export default buildConfig({
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Admins, MCPAgents, Products],
  plugins: [
    // Official Payload MCP server. Content-only surface — only `products` is
    // exposed; admins/mcp-agents are managed by humans in the admin panel.
    // Writes land as DRAFT (enforced by Products' forceDraftForMcpWrites
    // hook). Markdown body via the `contentMd` sidecar + markdownToLexical
    // hook so an LLM doesn't have to emit raw Lexical JSON.
    //
    // `disabled` is the global kill switch: MCP is OFF unless
    // MCP_ENABLED === 'true' in the environment.
    mcpPlugin({
      disabled: process.env.MCP_ENABLED !== 'true',
      // API keys are linked to mcp-agents rows (NOT admins). This makes the
      // agent a non-admin principal; collections that don't opt in via
      // `isAdminOrMcpAgent` reject the agent at the access layer even if a
      // tool existed.
      userCollection: 'mcp-agents',
      // Default-allow on a freshly-created API key: tick every tool
      // capability checkbox at create time so a key works out of the box; the
      // operator unticks to restrict. Safe because the plugin's
      // experimental.tools is NOT enabled — there are no
      // collection/config/job-mutation capability fields generated on the API
      // key collection.
      overrideApiKeyCollection: (collection) => {
        const grantByDefault = (fields: unknown[]): void => {
          for (const field of fields as Array<Record<string, unknown>>) {
            if (field.type === 'checkbox' && field.name !== 'enableAPIKey') {
              field.defaultValue = true
            }
            if (Array.isArray(field.fields)) grantByDefault(field.fields)
            if (Array.isArray(field.tabs)) {
              for (const tab of field.tabs as Array<Record<string, unknown>>) {
                if (Array.isArray(tab.fields)) grantByDefault(tab.fields)
              }
            }
          }
        }
        grantByDefault(collection.fields)
        return collection
      },
      collections: {
        products: { enabled: { find: true, create: true, update: true } },
      },
      mcp: {
        handlerOptions: {
          // basePath '/api' → endpoint mounted at /api/mcp (Streamable HTTP).
          basePath: '/api',
          disableSse: true,
          maxDuration: 60,
        },
        // Custom tools beyond the auto-generated find/create/update. Each is
        // OFF by default and must be ticked per-API-key (admin → MCP API Keys
        // → "Tools").
        //
        // Cast bridges a cross-zod-instance gap: the tools' schemas are
        // zod/v3 (from the project's zod@4) while this plugin pins its own
        // zod@3 — the two ZodRawShape types are structurally-but-not-
        // nominally equal, and checking one against the other trips ts2589.
        // Runtime is fine (the SDK duck-types v3 schemas). See lib/mcp-tools.ts.
        /* eslint-disable @typescript-eslint/no-explicit-any */
        tools: [createManyProductsTool as any, updateManyProductsTool as any],
        /* eslint-enable @typescript-eslint/no-explicit-any */
      },
    }),
  ],
  editor: lexicalEditor(),
  secret: requireEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: requireEnv('DATABASE_URL') },
  }),
  sharp,
})
