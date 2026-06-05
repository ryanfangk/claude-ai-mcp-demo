import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND, FONT, STYLES } from '@/lib/brand'
import { getSessionContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function relative(iso: string): string {
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

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default async function ProfilePage() {
  const { payload, user } = await getSessionContext()
  if (!user) {
    redirect('/login')
  }

  // Pull this user's purchases, joined with the product so the table can
  // show the title + icon. The product field on purchases is denormalized
  // (priceAtPaid, categoryAtPaid) so we don't strictly NEED the join —
  // the join is for the title and icon, which would be stale-on-rename
  // but that's fine for a buyer-facing receipt list.
  const purchases = await payload.find({
    collection: 'purchases',
    where: { user: { equals: user.id } },
    depth: 1,
    sort: '-purchasedAt',
    limit: 200,
    overrideAccess: false,
    user,
  })

  const totalSpent = purchases.docs.reduce(
    (sum, p) => sum + (typeof p.priceAtPaid === 'number' ? p.priceAtPaid : 0),
    0,
  )

  return (
    <main style={STYLES.pageMain}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={STYLES.pageHeading}>
          Hi, {(user as { name?: string }).name?.trim() || user.email}.
        </h1>
        <p style={STYLES.pageSubtitle}>
          Member since {memberSince(user.createdAt as string)}.{' '}
          <Link href="/" style={{ color: BRAND.coral, textDecoration: 'none' }}>
            Browse the catalogue →
          </Link>
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <KpiTile label="Purchases" value={purchases.totalDocs.toString()} accent={BRAND.coral} />
        <KpiTile label="Total spent" value={`$${totalSpent.toFixed(2)}`} accent={BRAND.indigo} />
        <KpiTile label="Email" value={user.email ?? ''} accent={BRAND.coral} small />
      </section>

      <section>
        <h2
          style={{
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: BRAND.slate,
            marginBottom: '1rem',
          }}
        >
          Your purchases
        </h2>

        {purchases.docs.length === 0 ? (
          <div
            style={{
              padding: '3rem 2rem',
              background: BRAND.surface,
              border: `1px dashed ${BRAND.hairline}`,
              borderRadius: '0.75rem',
              textAlign: 'center',
              fontFamily: FONT.sans,
            }}
          >
            <p style={{ color: BRAND.slate, margin: '0 0 0.4rem', fontWeight: 500 }}>
              No purchases yet.
            </p>
            <p style={{ color: BRAND.mute, margin: 0, fontSize: '0.95rem' }}>
              <Link href="/" style={{ color: BRAND.coral, textDecoration: 'none' }}>
                Pick something from the catalogue
              </Link>{' '}
              to put it here.
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
            {purchases.docs.map((p) => {
              const product = typeof p.product === 'object' && p.product ? p.product : null
              const title = product && typeof product.title === 'string' ? product.title : '(deleted product)'
              const slug = product && typeof product.slug === 'string' ? product.slug : null
              const icon = product && typeof product.icon === 'string' ? product.icon : '📦'
              return (
                <li
                  key={p.id as string}
                  style={{
                    ...STYLES.card,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>{icon}</div>
                  <div>
                    {slug ? (
                      <Link
                        href={`/products/${slug}`}
                        style={{ color: BRAND.ink, textDecoration: 'none', fontWeight: 500 }}
                      >
                        {title}
                      </Link>
                    ) : (
                      <span style={{ color: BRAND.ink, fontWeight: 500 }}>{title}</span>
                    )}
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: BRAND.mute,
                        textTransform: 'capitalize',
                        marginTop: '0.1rem',
                      }}
                    >
                      {p.categoryAtPaid ?? '—'}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.6rem',
                      borderTop: `1px solid ${BRAND.hairline}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: FONT.sans,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ fontWeight: 500, color: p.priceAtPaid === 0 ? BRAND.mute : BRAND.coral }}>
                      {p.priceAtPaid === 0
                        ? 'Free'
                        : `${Number(p.priceAtPaid).toFixed(2)} ${String(p.currency).toUpperCase()}`}
                    </span>
                    <span style={{ color: BRAND.mute }}>{relative(p.purchasedAt as string)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

function KpiTile({
  label,
  value,
  accent,
  small,
}: {
  label: string
  value: string
  accent: string
  small?: boolean
}) {
  return (
    <div
      style={{
        ...STYLES.card,
        position: 'relative',
        overflow: 'hidden',
        padding: '1.25rem 1.5rem',
      }}
    >
      <span aria-hidden style={{ position: 'absolute', inset: 'auto 0 0 0', height: '3px', background: accent }} />
      <div
        style={{
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: BRAND.mute,
          marginBottom: '0.4rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: small ? FONT.sans : FONT.serif,
          fontSize: small ? '1rem' : 'clamp(1.5rem, 3vw, 2rem)',
          lineHeight: 1.2,
          color: BRAND.ink,
          fontWeight: small ? 500 : 400,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}
