import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
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

export const generateSlug: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (operation === 'create' && data?.title && !data?.slug) {
    data.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
  return data
}
