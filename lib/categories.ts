// Single source of truth for the catalog category enum. Used by BOTH the
// Payload collection `category` select AND the MCP tool zod enum, so the admin
// options, the DB enum, and the agent-facing validation can never drift apart.
//
// Changing a *value* (not a label) is a DB enum change — write a migration.
// Labels are display-only and free to edit.

export const PRODUCT_CATEGORY_VALUES = [
  'cheatsheet',
  'guide',
  'template',
  'flashcards',
  'bundle',
] as const
export type ProductCategory = (typeof PRODUCT_CATEGORY_VALUES)[number]

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  cheatsheet: 'Cheat Sheet',
  guide: 'Guide',
  template: 'Template',
  flashcards: 'Flashcard Pack',
  bundle: 'Bundle',
}

export const PRODUCT_CATEGORY_OPTIONS = PRODUCT_CATEGORY_VALUES.map((value) => ({
  value,
  label: PRODUCT_CATEGORY_LABELS[value],
}))
