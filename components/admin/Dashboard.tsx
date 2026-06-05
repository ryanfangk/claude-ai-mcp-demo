// Custom Payload admin dashboard for the Pop-up Shop demo.
//
// Replaces Payload's stock "Collections list + Globals list" landing page with
// one screen that tells the demo story: *what's selling, what's in the
// catalogue, what has the MCP agent done lately.*
//
// Every number on this page is real DB state — no fabricated traffic — sourced
// via the Local API at render time. The Server Component holds the data work
// (find + bucket + reduce), and small client-component wrappers do nothing but
// hand plain arrays to Recharts. The chart library's bundle is the only client
// payload; the Payload Local API never crosses the client boundary.
//
// Wired in payload.config.ts as admin.components.views.dashboard.

import { getPayload } from 'payload'
import config from '@payload-config'

import StatTile from './dashboard/StatTile'
import RevenuePerDayChart from './dashboard/RevenuePerDayChart'
import ProductsPerDayChart from './dashboard/ProductsPerDayChart'
import CategoryDonut from './dashboard/CategoryDonut'
import PriceHistogram from './dashboard/PriceHistogram'
import RecentPurchasesTable from './dashboard/RecentPurchasesTable'
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

// Count rows per day across the last DAYS_WINDOW days, oldest-first. Zero
// days stay in the series so the area chart doesn't compress empty
// stretches into gaps. Used by the products-per-day chart.
function bucketCountByDay(
  timestamps: string[],
): Array<{ day: string; count: number }> {
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

// Build a contiguous day-by-day revenue series covering the last DAYS_WINDOW
// days (oldest-first). Days with no purchase are kept at zero so the chart
// doesn't compress empty stretches into gaps. Date.now() is hoisted out of
// the component body (React purity rule).
function bucketRevenueByDay(
  purchases: Array<{ purchasedAt?: unknown; priceAtPaid?: unknown }>,
): Array<{ day: string; revenue: number }> {
  const sums = new Map<string, number>()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = DAYS_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    sums.set(d.toISOString().slice(0, 10), 0)
  }
  for (const p of purchases) {
    if (typeof p.purchasedAt === 'string') {
      const key = p.purchasedAt.slice(0, 10)
      if (sums.has(key)) {
        sums.set(
          key,
          (sums.get(key) ?? 0) + (typeof p.priceAtPaid === 'number' ? p.priceAtPaid : 0),
        )
      }
    }
  }
  return Array.from(sums.entries()).map(([day, revenue]) => ({ day, revenue }))
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

// Pick the "headline" currency by majority share of purchases. The demo
// supports usd/cad/eur so the revenue label needs a single denomination —
// just go with whichever appears most often.
function dominantCurrency(purchases: Array<{ currency?: unknown }>): string {
  if (purchases.length === 0) return 'USD'
  const counts = new Map<string, number>()
  for (const p of purchases) {
    if (typeof p.currency === 'string') {
      counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1)
    }
  }
  if (counts.size === 0) return 'USD'
  let max = 0
  let winner = 'USD'
  for (const [c, n] of counts) {
    if (n > max) {
      max = n
      winner = c
    }
  }
  return winner.toUpperCase()
}

export default async function Dashboard() {
  const payload = await getPayload({ config })

  // Three concurrent finds. At demo scale this is a few hundred rows total;
  // if the dataset ever grows, swap to per-card scoped queries with cheaper
  // shape (depth: 0 + select).
  const [allProducts, allPurchases, agents] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 10_000,
      pagination: false,
      depth: 0,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'purchases',
      limit: 10_000,
      pagination: false,
      depth: 1, // pull product + user for the recent-purchases table
      sort: '-purchasedAt',
    }),
    payload.find({
      collection: 'mcp-agents',
      limit: 1000,
      pagination: false,
      depth: 0,
      sort: '-lastSeenAt',
    }),
  ])

  const products = allProducts.docs
  const purchases = allPurchases.docs

  const totalProducts = products.length
  const totalPurchases = purchases.length
  const totalRevenue = purchases.reduce(
    (sum, p) => sum + (typeof p.priceAtPaid === 'number' ? p.priceAtPaid : 0),
    0,
  )
  const totalAgents = agents.docs.length
  const activeAgents = agents.docs.filter((a) => a.active === true).length
  const lastSeenIso =
    agents.docs.find((a) => typeof a.lastSeenAt === 'string')?.lastSeenAt ?? null
  const lastSeenAgentName = agents.docs.find((a) => typeof a.lastSeenAt === 'string')?.name ?? null

  const revenueCurrency = dominantCurrency(
    purchases.map((p) => ({ currency: p.currency as string | undefined })),
  )

  const revenuePerDay = bucketRevenueByDay(
    purchases.map((p) => ({
      purchasedAt: p.purchasedAt as string | undefined,
      priceAtPaid: typeof p.priceAtPaid === 'number' ? p.priceAtPaid : 0,
    })),
  )

  const productsPerDay = bucketCountByDay(
    products
      .map((p) => p.createdAt)
      .filter((t): t is string => typeof t === 'string'),
  )

  const byCategory = bucketByCategory(
    products.map((p) => ({ category: (p.category as string | null | undefined) ?? null })),
  )
  const byPrice = bucketByPrice(
    products.map((p) => ({ price: typeof p.price === 'number' ? p.price : null })),
  )

  const recentPurchases = purchases.slice(0, RECENT_TABLE_SIZE).map((p) => {
    // depth: 1 populated product + user into the response. Cast through
    // a narrow shape rather than Record — typed Payload models don't carry
    // a string index signature, so a Record cast trips ts2352.
    const product =
      typeof p.product === 'object' && p.product !== null
        ? (p.product as { title?: unknown; icon?: unknown; slug?: unknown })
        : null
    const user =
      typeof p.user === 'object' && p.user !== null
        ? (p.user as { email?: unknown; name?: unknown })
        : null
    return {
      id: String(p.id),
      productTitle: typeof product?.title === 'string' ? product.title : '(deleted product)',
      productIcon: typeof product?.icon === 'string' ? product.icon : '📦',
      productSlug: typeof product?.slug === 'string' ? product.slug : null,
      buyerEmail: typeof user?.email === 'string' ? user.email : '(deleted user)',
      buyerName: typeof user?.name === 'string' ? user.name : null,
      priceAtPaid: typeof p.priceAtPaid === 'number' ? p.priceAtPaid : 0,
      currency: typeof p.currency === 'string' ? p.currency : 'usd',
      purchasedAt:
        typeof p.purchasedAt === 'string' ? p.purchasedAt : new Date().toISOString(),
    }
  })

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
        <StatTile label="Purchases" value={totalPurchases.toString()} accent={BRAND.indigo} />
        <StatTile
          label="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          accent={BRAND.coral}
        />
        <StatTile
          label="Active agents"
          value={`${activeAgents} of ${totalAgents}`}
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
        <h2 style={cardTitleStyle()}>Revenue — last 30 days</h2>
        <RevenuePerDayChart
          data={revenuePerDay}
          coral={BRAND.coral}
          mute={BRAND.mute}
          hairline={BRAND.hairline}
          currency={revenueCurrency}
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
        <ProductsPerDayChart
          data={productsPerDay}
          indigo={BRAND.indigo}
          mute={BRAND.mute}
          hairline={BRAND.hairline}
        />
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
        <h2 style={cardTitleStyle()}>Recent purchases</h2>
        <RecentPurchasesTable
          rows={recentPurchases}
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
