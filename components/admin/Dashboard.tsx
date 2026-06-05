// Custom Payload admin dashboard for the Pop-up Shop demo.
//
// Replaces Payload's stock "Collections list + Globals list" landing page with
// one screen that tells the demo story: *what has the MCP agent done to this
// shop, and what's it look like right now?*
//
// Every number on this page is real DB state — no fabricated sales / views /
// customers — sourced via the Local API at render time. Data shape is held
// minimal here in the Server Component and handed to small client-component
// chart wrappers, so the chart libraries' client bundle is the only client
// payload and the data fetch never leaves the server.
//
// Wired in payload.config.ts as admin.components.views.dashboard.

import { getPayload } from 'payload'
import config from '@payload-config'

import StatTile from './dashboard/StatTile'
import ProductsPerDayChart from './dashboard/ProductsPerDayChart'
import CategoryDonut from './dashboard/CategoryDonut'
import PriceHistogram from './dashboard/PriceHistogram'
import RecentProductsTable from './dashboard/RecentProductsTable'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/categories'

const BRAND = {
  coral: '#f25f3b',
  indigo: '#1e1b4b',
  ink: '#0b0d10',
  slate: '#3a3e47',
  mute: '#6b7280',
  hairline: '#e5e7eb',
  surface: '#f8f9fa',
  canvas: '#ffffff',
} as const

const DAYS_WINDOW = 30
const RECENT_TABLE_SIZE = 10

const PRICE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: 'Free', min: 0, max: 0 },
  { label: '$0–10', min: 0.01, max: 10 },
  { label: '$10–25', min: 10.01, max: 25 },
  { label: '$25–50', min: 25.01, max: 50 },
  { label: '$50+', min: 50.01, max: Number.POSITIVE_INFINITY },
]

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'just now'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  return `${day} days ago`
}

// Bucket a series of ISO date strings into a contiguous day-by-day count
// covering the last DAYS_WINDOW days, oldest-first. Zero-days are kept so
// the line chart doesn't compress empty stretches into gaps.
function bucketByDay(timestamps: string[]): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = DAYS_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    counts.set(d.toISOString().slice(0, 10), 0)
  }
  for (const t of timestamps) {
    const key = t.slice(0, 10)
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([day, count]) => ({ day, count }))
}

function bucketByCategory(items: Array<{ category: string | null | undefined }>) {
  const counts = new Map<string, number>()
  for (const opt of PRODUCT_CATEGORY_OPTIONS) counts.set(opt.value, 0)
  for (const it of items) {
    if (it.category && counts.has(it.category)) {
      counts.set(it.category, (counts.get(it.category) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      label: PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category,
      count,
    }))
    .filter((r) => r.count > 0)
}

function bucketByPrice(items: Array<{ price: number | null | undefined }>) {
  return PRICE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: items.filter((it) => {
      const p = typeof it.price === 'number' ? it.price : null
      if (p === null) return false
      return p >= bucket.min && p <= bucket.max
    }).length,
  }))
}

export default async function Dashboard() {
  const payload = await getPayload({ config })

  // One query pulls every product needed by the four cards + the table. At
  // demo scale this is a few hundred rows at most; if it ever grows, swap to
  // per-card scoped queries.
  const allProducts = await payload.find({
    collection: 'products',
    limit: 10_000,
    pagination: false,
    depth: 0,
    sort: '-createdAt',
  })

  const agents = await payload.find({
    collection: 'mcp-agents',
    limit: 1000,
    pagination: false,
    depth: 0,
    sort: '-lastSeenAt',
  })

  const products = allProducts.docs
  const totalProducts = products.length
  const categoriesUsed = new Set(products.map((p) => p.category).filter(Boolean)).size
  const totalAgents = agents.docs.length
  const activeAgents = agents.docs.filter((a) => a.active === true).length
  const lastSeenIso =
    agents.docs.find((a) => typeof a.lastSeenAt === 'string')?.lastSeenAt ?? null
  const lastSeenAgentName = agents.docs.find((a) => typeof a.lastSeenAt === 'string')?.name ?? null

  const sinceMs = Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000
  const recentWindow = products.filter(
    (p) => typeof p.createdAt === 'string' && new Date(p.createdAt).getTime() >= sinceMs,
  )

  const perDay = bucketByDay(
    recentWindow
      .map((p) => p.createdAt)
      .filter((t): t is string => typeof t === 'string'),
  )
  const byCategory = bucketByCategory(
    products.map((p) => ({ category: (p.category as string | null | undefined) ?? null })),
  )
  const byPrice = bucketByPrice(
    products.map((p) => ({ price: typeof p.price === 'number' ? p.price : null })),
  )

  const recent = products.slice(0, RECENT_TABLE_SIZE).map((p) => ({
    id: String(p.id),
    title: typeof p.title === 'string' ? p.title : '(untitled)',
    category: typeof p.category === 'string' ? p.category : null,
    price: typeof p.price === 'number' ? p.price : 0,
    currency: typeof p.currency === 'string' ? p.currency : 'usd',
    icon: typeof p.icon === 'string' ? p.icon : '📦',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
  }))

  return (
    <main
      style={{
        padding: '2rem 2.5rem 4rem',
        fontFamily: 'var(--font-brand-sans, -apple-system, system-ui, sans-serif)',
        color: BRAND.ink,
        background: BRAND.canvas,
        minHeight: '100vh',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-brand-serif, Georgia, serif)',
              fontWeight: 400,
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              letterSpacing: '-0.01em',
              margin: 0,
              color: BRAND.ink,
            }}
          >
            pop-up shop
          </h1>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: '0.7rem',
              height: '0.7rem',
              borderRadius: '999px',
              background: BRAND.coral,
              alignSelf: 'center',
            }}
          />
          <span
            style={{
              marginLeft: '0.75rem',
              fontSize: '0.95rem',
              color: BRAND.slate,
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Activity
          </span>
        </div>
        <p
          style={{
            margin: '0.5rem 0 0',
            color: BRAND.mute,
            fontSize: '0.9rem',
          }}
        >
          Last MCP write:{' '}
          <strong style={{ color: BRAND.indigo, fontWeight: 500 }}>
            {formatRelative(lastSeenIso)}
          </strong>
          {lastSeenAgentName ? (
            <>
              {' '}
              by <code style={{ fontFamily: 'ui-monospace, monospace', color: BRAND.coral }}>
                {lastSeenAgentName}
              </code>
            </>
          ) : null}
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <StatTile label="Products" value={totalProducts.toString()} accent={BRAND.coral} />
        <StatTile label="Categories" value={categoriesUsed.toString()} accent={BRAND.indigo} />
        <StatTile
          label="Active agents"
          value={`${activeAgents} of ${totalAgents}`}
          accent={BRAND.coral}
        />
        <StatTile
          label="Catalogue value"
          value={`$${products.reduce((a, p) => a + (typeof p.price === 'number' ? p.price : 0), 0).toFixed(2)}`}
          accent={BRAND.indigo}
        />
      </section>

      <section
        style={{
          background: BRAND.surface,
          border: `1px solid ${BRAND.hairline}`,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={cardTitleStyle()}>Products created — last 30 days</h2>
        <ProductsPerDayChart data={perDay} coral={BRAND.coral} mute={BRAND.mute} hairline={BRAND.hairline} />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: BRAND.surface,
            border: `1px solid ${BRAND.hairline}`,
            borderRadius: '0.75rem',
            padding: '1.5rem',
          }}
        >
          <h2 style={cardTitleStyle()}>Products by category</h2>
          {byCategory.length === 0 ? (
            <EmptyHint />
          ) : (
            <CategoryDonut
              data={byCategory}
              palette={[BRAND.coral, BRAND.indigo, '#cca175', '#7d00ff', '#10b981']}
              mute={BRAND.mute}
            />
          )}
        </div>
        <div
          style={{
            background: BRAND.surface,
            border: `1px solid ${BRAND.hairline}`,
            borderRadius: '0.75rem',
            padding: '1.5rem',
          }}
        >
          <h2 style={cardTitleStyle()}>Price distribution</h2>
          <PriceHistogram data={byPrice} indigo={BRAND.indigo} mute={BRAND.mute} hairline={BRAND.hairline} />
        </div>
      </section>

      <section
        style={{
          background: BRAND.surface,
          border: `1px solid ${BRAND.hairline}`,
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2 style={cardTitleStyle()}>Recent products</h2>
        <RecentProductsTable
          rows={recent}
          ink={BRAND.ink}
          mute={BRAND.mute}
          hairline={BRAND.hairline}
          coral={BRAND.coral}
        />
      </section>
    </main>
  )
}

function cardTitleStyle(): React.CSSProperties {
  return {
    margin: '0 0 1rem',
    fontFamily: 'var(--font-brand-sans, system-ui, sans-serif)',
    fontWeight: 500,
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: BRAND.slate,
  }
}

function EmptyHint() {
  return (
    <p
      style={{
        margin: 0,
        padding: '1.5rem 0',
        textAlign: 'center',
        color: BRAND.mute,
        fontSize: '0.9rem',
      }}
    >
      No products yet. Ask Claude to call <code style={{ color: BRAND.coral }}>createManyProducts</code>.
    </p>
  )
}
