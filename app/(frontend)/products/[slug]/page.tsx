import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BRAND, FONT, STYLES } from '@/lib/brand'

export const dynamic = 'force-dynamic'

// Product detail page. Anonymous-readable (storefront read access is
// public, per Products.access.read in the collection config) — but the
// "Buy now" button on this page routes to /checkout/<slug>, which
// auth-gates.
//
// Lexical rich-text rendering is deliberately *not* wired in here. The
// `description` (textarea) is shown as a short summary; the `content`
// (Lexical JSON) is collapsed to a placeholder so we don't ship a
// rich-text renderer just for the demo. If/when that matters, replace
// the placeholder with @payloadcms/richtext-lexical's RichText component.

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const product = result.docs[0]
  if (!product) notFound()

  const price =
    product.price === 0
      ? 'Free'
      : `${Number(product.price).toFixed(2)} ${String(product.currency).toUpperCase()}`

  return (
    <main style={STYLES.pageMain}>
      <nav style={{ marginBottom: '1.5rem', fontFamily: FONT.sans, fontSize: '0.85rem' }}>
        <Link href="/" style={{ color: BRAND.mute, textDecoration: 'none' }}>
          ← Back to catalogue
        </Link>
      </nav>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        <section>
          <div style={{ fontSize: '4.5rem', lineHeight: 1, marginBottom: '1.5rem' }}>
            {product.icon ?? '📦'}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 500,
              color: BRAND.coral,
              marginBottom: '0.5rem',
            }}
          >
            {product.category}
          </div>
          <h1 style={{ ...STYLES.pageHeading, marginBottom: '0.5rem' }}>{product.title}</h1>
          {product.subtitle ? (
            <p style={{ ...STYLES.pageSubtitle, marginBottom: '1.5rem' }}>{product.subtitle}</p>
          ) : null}
          {product.description ? (
            <p
              style={{
                fontFamily: FONT.sans,
                fontSize: '1rem',
                lineHeight: 1.6,
                color: BRAND.ink,
                margin: 0,
              }}
            >
              {product.description}
            </p>
          ) : null}
        </section>

        <aside
          style={{
            ...STYLES.card,
            position: 'sticky',
            top: '5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.mute, fontWeight: 500, marginBottom: '0.4rem' }}>
              Price
            </div>
            <div
              style={{
                fontFamily: FONT.serif,
                fontSize: '2rem',
                lineHeight: 1.1,
                color: product.price === 0 ? BRAND.indigo : BRAND.ink,
              }}
            >
              {price}
            </div>
          </div>
          <Link href={`/checkout/${slug}`} style={{ ...STYLES.primaryButton, width: '100%' }}>
            {product.price === 0 ? 'Get it' : 'Buy now'}
          </Link>
          <p style={{ margin: 0, fontSize: '0.75rem', color: BRAND.mute, fontFamily: FONT.sans }}>
            Mock checkout — no real payment is taken. The purchase will appear on your profile
            immediately.
          </p>
        </aside>
      </div>
    </main>
  )
}
