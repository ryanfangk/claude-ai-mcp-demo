import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

// Pop-up Shop storefront. The single live demo surface — every product
// here arrived either through the admin or an MCP createProducts call,
// and (per the auto-publish rule) is live the instant it lands.
//
// Brand tokens from docs/reference/branding-guideline/brand-guidelines.md
// are inlined rather than pulled from a stylesheet — the project doesn't
// have a frontend CSS pipeline yet, and matching the Payload admin's coral
// + indigo without a CSS layer is worth the small duplication.
const BRAND = {
  coral: '#f25f3b',
  coralDark: '#c44324',
  indigo: '#1e1b4b',
  ink: '#0b0d10',
  slate: '#3a3e47',
  mute: '#6b7280',
  hairline: '#e5e7eb',
  surface: '#f8f9fa',
  canvas: '#ffffff',
} as const

const FONT_SERIF = 'var(--font-brand-serif), Georgia, serif'
const FONT_SANS = 'var(--font-brand-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif'

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
    <main
      style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: '4rem 1.5rem 6rem',
        fontFamily: FONT_SANS,
      }}
    >
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <h1
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: BRAND.ink,
              margin: 0,
            }}
          >
            pop-up shop
          </h1>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: '0.85rem',
              height: '0.85rem',
              borderRadius: '999px',
              background: BRAND.coral,
              alignSelf: 'center',
            }}
          />
        </div>

        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: '1.125rem',
            lineHeight: 1.5,
            color: BRAND.slate,
            maxWidth: 560,
            margin: '0 0 1.75rem',
          }}
        >
          A storefront, ready to go. Plug in a catalogue, point an agent at it,
          demo it on a screen.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontFamily: FONT_SANS,
            fontSize: '0.875rem',
            color: BRAND.mute,
          }}
        >
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.55rem 1.1rem',
              borderRadius: '999px',
              background: BRAND.coral,
              color: BRAND.canvas,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Open admin
          </Link>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.55rem 1.1rem',
              borderRadius: '999px',
              border: `1px solid ${BRAND.hairline}`,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
              fontFamily: FONT_SANS,
              fontWeight: 500,
              fontSize: '1rem',
              letterSpacing: '0.04em',
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
              Create a product in the <Link href="/admin" style={{ color: BRAND.coral, textDecoration: 'none' }}>admin</Link>,
              or ask Claude to call <code style={{ fontFamily: 'ui-monospace, monospace', color: BRAND.indigo }}>createManyProducts</code>.
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
              <li
                key={p.id}
                style={{
                  padding: '1.25rem',
                  background: BRAND.canvas,
                  border: `1px solid ${BRAND.hairline}`,
                  borderRadius: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>{p.icon ?? '📦'}</div>
                <div>
                  <h3
                    style={{
                      fontFamily: FONT_SANS,
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
          fontFamily: FONT_SANS,
          fontSize: '0.8rem',
          color: BRAND.mute,
        }}
      >
        Pop-up shop — claude ai mcp demo.
      </footer>
    </main>
  )
}
