import type { CollectionBeforeChangeHook, CollectionBeforeOperationHook, CollectionBeforeValidateHook } from 'payload'
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'

let cachedEditorConfig: Awaited<ReturnType<typeof editorConfigFactory.default>> | null = null

/**
 * Markdown authoring path for programmatic (MCP) clients.
 *
 * The plugin generates each tool's input schema from the collection's field
 * configs, so a `richText` field would demand a raw Lexical JSON node-tree —
 * impractical for an LLM to emit. Each content collection exposes a
 * `contentMd` markdown sidecar; this hook converts it into `content` on write,
 * then clears it (so a later human edit of `content` is never silently
 * clobbered by a stale markdown value re-converting on the next save).
 */
export const markdownToLexical: CollectionBeforeChangeHook = async ({ data, req }) => {
  const md = data?.contentMd
  if (typeof md === 'string' && md.trim().length > 0) {
    if (!cachedEditorConfig) {
      cachedEditorConfig = await editorConfigFactory.default({ config: req.payload.config })
    }
    data.content = convertMarkdownToLexical({ editorConfig: cachedEditorConfig, markdown: md })
    data.contentMd = null
  }
  return data
}

/**
 * Force MCP writes to land as DRAFT, never published — and on an update of an
 * already-published row, PRESERVE the live version (the edit waits as a
 * separate draft for a human to publish).
 *
 * The plugin's `draft` tool arg defaults to publish, and content collections'
 * write access lets the agent through — so without this an agent could publish
 * directly. The plugin sets `req.payloadAPI === 'MCP'` on every tool request,
 * the reliable signal.
 *
 * Forces the OPERATION's `draft: true` flag, NOT `data._status = 'draft'`. The
 * distinction matters on an update of a published row: flipping `_status`
 * would UNPUBLISH the live version; `draft: true` instead writes a new draft
 * version on top while the published version stays current.
 */
export const forceDraftForMcpWrites: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (
    (operation === 'create' || operation === 'update') &&
    (args.req as { payloadAPI?: string })?.payloadAPI === 'MCP'
  ) {
    ;(args as { draft?: boolean }).draft = true
  }
  return args
}

export const generateSlug: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (operation === 'create' && data?.title && !data?.slug) {
    data.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
  return data
}
