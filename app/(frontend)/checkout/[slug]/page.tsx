import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BRAND, FONT, STYLES } from '@/lib/brand'
import { getSessionUser } from '@/lib/auth'
import { checkoutAction } from '@/app/(frontend)/_actions/checkout'
import AuthForm from '@/app/(frontend)/_components/AuthForm'

export const dynamic = 'force-dynamic'

// Mock-checkout confirmation screen. Bounce-to-login if anonymous; the
// `next=` param brings the user right back here after sign-in. The
// "Confirm purchase" button hands off to the checkoutAction server action
// which creates the Purchases row and redirects to /checkout/success.

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await getSessionUser()
  if (!user) {
    redirect(`/login?next=/checkout/${encodeURIComponent(slug)}`)
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const product = result.docs[0]
  if (!product) notFound()

  const priceLabel =
    product.price === 0
      ? 'Free'
      : `${Number(product.price).toFixed(2)} ${String(product.currency).toUpperCase()}`

  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 520 }}>
      <h1 style={STYLES.pageHeading}>Confirm purchase</h1>
      <p style={STYLES.pageSubtitle}>
        This is a mock checkout. Pressing the button below records the purchase against your
        account — no payment is taken.
      </p>

      <div style={STYLES.card}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{product.icon ?? '📦'}</div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT.serif,
                fontSize: '1.3rem',
                color: BRAND.ink,
                lineHeight: 1.2,
              }}
            >
              {product.title}
            </div>
            <div style={{ fontSize: '0.85rem', color: BRAND.mute, textTransform: 'capitalize', marginTop: '0.15rem' }}>
              {product.category}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '0.75rem 0',
            borderTop: `1px solid ${BRAND.hairline}`,
            borderBottom: `1px solid ${BRAND.hairline}`,
            marginBottom: '1.25rem',
          }}
        >
          <span style={{ fontFamily: FONT.sans, color: BRAND.slate, fontSize: '0.9rem' }}>
            You&apos;ll be charged
          </span>
          <span
            style={{
              fontFamily: FONT.serif,
              fontSize: '1.5rem',
              color: product.price === 0 ? BRAND.indigo : BRAND.coral,
            }}
          >
            {priceLabel}
          </span>
        </div>

        <AuthForm action={checkoutAction} submitLabel="Confirm purchase">
          <input type="hidden" name="slug" value={slug} />
        </AuthForm>

        <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: BRAND.mute, fontFamily: FONT.sans }}>
          You&apos;re signed in as <strong>{user.email}</strong>.{' '}
          <Link href={`/products/${slug}`} style={{ color: BRAND.coral, textDecoration: 'none' }}>
            Cancel
          </Link>
        </p>
      </div>
    </main>
  )
}
