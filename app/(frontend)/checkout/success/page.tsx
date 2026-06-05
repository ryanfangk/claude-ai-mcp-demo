import Link from 'next/link'
import { BRAND, FONT, STYLES } from '@/lib/brand'

export const dynamic = 'force-dynamic'

type Search = { slug?: string }

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams
  const slug = typeof sp.slug === 'string' ? sp.slug : null

  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 520, textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: '999px',
          background: BRAND.coral,
          color: BRAND.canvas,
          fontFamily: FONT.serif,
          fontSize: '2.25rem',
          margin: '0 auto 1.5rem',
        }}
        aria-hidden
      >
        ✓
      </div>

      <h1 style={STYLES.pageHeading}>Purchase complete.</h1>
      <p style={STYLES.pageSubtitle}>
        It&apos;s on your profile alongside anything else you&apos;ve bought.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginTop: '0.5rem',
        }}
      >
        <Link href="/profile" style={STYLES.primaryButton}>
          See it on your profile
        </Link>
        <Link href="/" style={STYLES.secondaryButton}>
          Keep browsing
        </Link>
      </div>

      {slug ? (
        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: BRAND.mute, fontFamily: FONT.sans }}>
          <Link href={`/products/${slug}`} style={{ color: BRAND.coral, textDecoration: 'none' }}>
            View the product
          </Link>{' '}
          you just bought.
        </p>
      ) : null}
    </main>
  )
}
