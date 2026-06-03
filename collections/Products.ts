import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrMcpAgent, publishedOrAdminOrMcpAgent } from './access'
import { forceDraftForMcpWrites, generateSlug, markdownToLexical } from './mcpHooks'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/categories'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'price', 'category', '_status', 'featured'],
  },
  versions: { drafts: true },
  trash: true,
  access: {
    read: publishedOrAdminOrMcpAgent,
    create: isAdminOrMcpAgent,
    update: isAdminOrMcpAgent,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [generateSlug],
    beforeOperation: [forceDraftForMcpWrites],
    beforeChange: [markdownToLexical],
  },
  fields: [
    {
      name: 'publicId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      defaultValue: () => crypto.randomUUID(),
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Stable external identifier (UUID v4).',
      },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'subtitle', type: 'text' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      validate: (val: number | null | undefined) => {
        if (val == null) return true
        const str = String(val)
        const dot = str.indexOf('.')
        if (dot !== -1 && str.length - dot - 1 > 2) {
          return 'Price must have at most 2 decimal places (e.g., 7.99, not 7.999)'
        }
        return true
      },
      admin: {
        step: 0.01,
        description: 'Price in major currency units (e.g. 7.99 = $7.99). At most 2 decimal places. 0 = free.',
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'usd',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'CAD', value: 'cad' },
        { label: 'EUR', value: 'eur' },
      ],
      admin: { position: 'sidebar', description: 'ISO 4217 lowercase currency code.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: PRODUCT_CATEGORY_OPTIONS,
    },
    { name: 'icon', type: 'text', defaultValue: '📄' },
    {
      name: 'contentMd',
      type: 'textarea',
      admin: {
        description:
          'Markdown authoring input for MCP/programmatic clients. On save it is converted into the `content` rich-text field and then cleared. Human editors should use the `content` editor directly and leave this blank.',
      },
    },
    { name: 'content', type: 'richText' },
    { name: 'featured', type: 'checkbox', defaultValue: false },
  ],
}
