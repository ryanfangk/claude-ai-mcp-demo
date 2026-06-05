import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BRAND, FONT, STYLES } from '@/lib/brand'

export const dynamic = 'force-dynamic'

// Pop-up Shop storefront catalogue. The wordmark + nav now lives in the
// shared Header rendered by the (frontend)/layout.tsx — this page focuses
// on the hero copy + product grid. Each card links to /products/[slug]
// where the visitor can read more and start the (mock) checkout.

export default async function Home() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 50,
    sort: '-createdAt',
  })

  const mcpEnabled = process.env.MCP_ENABLED === 'true'

  return (
    <main style={STYLES.pageMain}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={STYLES.pageHeading}>A storefront, ready to go.</h1>
        <p style={STYLES.pageSubtitle}>
          Plug in a catalogue, point an agent at it, demo it on a screen.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/admin" style={STYLES.secondaryButton}>
            Open admin
          </Link>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.55rem 1.1rem',
              borderRadius: '999px',
              border: `1px solid ${BRAND.hairline}`,
              fontFamily: FONT.mono,
              fontSize: '0.85rem',
              color: BRAND.slate,
            }}
          >
            <code style={{ color: BRAND.indigo }}>/api/mcp</code>
            <span style={{ margin: '0 0.5rem', color: BRAND.hairline }}>·</span>
            <span style={{ color: mcpEnabled ? BRAND.coral : BRAND.mute, fontWeight: 500 }}>
              {mcpEnabled ? 'MCP enabled' : 'MCP off'}
            </span>
          </span>
        </div>
      </header>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <h2
            style={{
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: BRAND.slate,
              margin: 0,
            }}
          >
            Catalogue
          </h2>
          <span style={{ color: BRAND.mute, fontSize: '0.875rem' }}>
            {docs.length} {docs.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        {docs.length === 0 ? (
          <div
            style={{
              padding: '3rem 2rem',
              background: BRAND.surface,
              border: `1px dashed ${BRAND.hairline}`,
              borderRadius: '1rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: BRAND.slate, margin: '0 0 0.5rem', fontWeight: 500 }}>
              The shelves are empty.
            </p>
            <p style={{ color: BRAND.mute, margin: 0, fontSize: '0.95rem' }}>
              Create a product in the{' '}
              <Link href="/admin" style={{ color: BRAND.coral, textDecoration: 'none' }}>
                admin
              </Link>
              , or ask Claude to call{' '}
              <code style={{ fontFamily: FONT.mono, color: BRAND.indigo }}>createManyProducts</code>.
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {docs.map((p) => (
              <li key={p.id} style={{ margin: 0 }}>
                <Link
                  href={`/products/${p.slug}`}
                  style={{
                    ...STYLES.card,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>{p.icon ?? '📦'}</div>
                  <div>
                    <h3
                      style={{
                        fontFamily: FONT.sans,
                        fontWeight: 500,
                        fontSize: '1rem',
                        color: BRAND.ink,
                        margin: '0 0 0.25rem',
                      }}
                    >
                      {p.title}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: BRAND.mute, textTransform: 'capitalize' }}>
                      {p.category}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.6rem',
                      borderTop: `1px solid ${BRAND.hairline}`,
                      fontWeight: 500,
                      color: p.price === 0 ? BRAND.indigo : BRAND.coral,
                    }}
                  >
                    {p.price === 0 ? 'Free' : `${p.price.toFixed(2)} ${p.currency.toUpperCase()}`}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer
        style={{
          marginTop: '5rem',
          paddingTop: '2rem',
          borderTop: `1px solid ${BRAND.hairline}`,
          fontFamily: FONT.sans,
          fontSize: '0.8rem',
          color: BRAND.mute,
        }}
      >
        Pop-up shop — claude ai mcp demo.
      </footer>
    </main>
  )
}
