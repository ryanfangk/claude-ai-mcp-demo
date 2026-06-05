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
// Layout: single centered hero card that groups icon + category + title +
// subtitle + price + CTA above the fold (no asymmetric two-column with a
// floating sidebar). Description sits below in a constrained column so
// long text doesn't sprawl to full page width.
//
// Lexical rich-text rendering is deliberately *not* wired in here. The
// `description` (textarea) is rendered as plain prose; the `content`
// (Lexical JSON) is unrendered until we ship a Lexical renderer.

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

  const isFree = product.price === 0
  const priceLabel = isFree
    ? 'Free'
    : `${Number(product.price).toFixed(2)} ${String(product.currency).toUpperCase()}`

  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 720, padding: '2rem 1.5rem 5rem' }}>
      <nav style={{ marginBottom: '1.5rem', fontFamily: FONT.sans, fontSize: '0.85rem' }}>
        <Link href="/" style={{ color: BRAND.mute, textDecoration: 'none' }}>
          ← Back to catalogue
        </Link>
      </nav>

      <section
        style={{
          ...STYLES.card,
          padding: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: '1.5rem',
          rowGap: '0.5rem',
          alignItems: 'start',
        }}
      >
        {/* Icon medallion — square, brand-tinted background so a single
            emoji doesn't float in white space. */}
        <div
          style={{
            gridRow: 'span 4',
            width: '4.5rem',
            height: '4.5rem',
            borderRadius: '0.85rem',
            background: BRAND.surface,
            border: `1px solid ${BRAND.hairline}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.25rem',
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-hidden
        >
          {product.icon ?? '📦'}
        </div>

        <div
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
            color: BRAND.coral,
          }}
        >
          {product.category}
        </div>

        <h1
          style={{
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: 'clamp(1.75rem, 4vw, 2.4rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: BRAND.ink,
            margin: 0,
          }}
        >
          {product.title}
        </h1>

        {product.subtitle ? (
          <p
            style={{
              fontFamily: FONT.sans,
              fontSize: '1.05rem',
              lineHeight: 1.4,
              color: BRAND.slate,
              margin: 0,
            }}
          >
            {product.subtitle}
          </p>
        ) : (
          <span />
        )}

        {/* Price + CTA row spans both columns so the action sits below the
            content as a wide bar — not as a narrow sidebar. */}
        <div
          style={{
            gridColumn: '1 / -1',
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: `1px solid ${BRAND.hairline}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: BRAND.mute,
                fontWeight: 500,
                marginBottom: '0.2rem',
              }}
            >
              Price
            </div>
            <div
              style={{
                fontFamily: FONT.serif,
                fontSize: '2rem',
                lineHeight: 1.1,
                color: isFree ? BRAND.indigo : BRAND.ink,
              }}
            >
              {priceLabel}
            </div>
          </div>
          <Link
            href={`/checkout/${slug}`}
            style={{
              ...STYLES.primaryButton,
              padding: '0.85rem 2rem',
              fontSize: '1rem',
            }}
          >
            {isFree ? 'Get it' : 'Buy now'}
          </Link>
        </div>

        <p
          style={{
            gridColumn: '1 / -1',
            margin: 0,
            fontSize: '0.8rem',
            color: BRAND.mute,
            fontFamily: FONT.sans,
          }}
        >
          Mock checkout — no real payment is taken. The purchase will appear on your profile
          immediately.
        </p>
      </section>

      {product.description ? (
        <section
          style={{
            maxWidth: 620,
            margin: '2.5rem auto 0',
            padding: '0 0.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: BRAND.slate,
              margin: '0 0 0.75rem',
            }}
          >
            About this
          </h2>
          <p
            style={{
              fontFamily: FONT.sans,
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: BRAND.ink,
              margin: 0,
            }}
          >
            {product.description}
          </p>
        </section>
      ) : null}
    </main>
  )
}
