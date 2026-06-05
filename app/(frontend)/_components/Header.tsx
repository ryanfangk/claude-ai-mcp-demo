import Link from 'next/link'
import { BRAND, FONT } from '@/lib/brand'
import { getSessionUser } from '@/lib/auth'
import { logoutAction } from '@/app/(frontend)/_actions/auth'

// Storefront top nav. Server Component — reads the session synchronously
// at render time, so an authenticated user always sees the "Profile / Sign
// out" pair and an anonymous user always sees "Sign in / Register" without
// a client-side flicker.
//
// The wordmark on the left clicks back to "/" (catalogue). Right side is the
// identity surface. Mounted from app/(frontend)/layout.tsx so every storefront
// page inherits it without per-route boilerplate.
export default async function Header() {
  const user = await getSessionUser()

  return (
    <header
      style={{
        borderBottom: `1px solid ${BRAND.hairline}`,
        background: BRAND.canvas,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontFamily: FONT.sans,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '0.4rem',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontFamily: FONT.serif,
              fontSize: '1.4rem',
              color: BRAND.ink,
              letterSpacing: '-0.01em',
            }}
          >
            pop-up shop
          </span>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: '0.55rem',
              height: '0.55rem',
              borderRadius: '999px',
              background: BRAND.coral,
              alignSelf: 'center',
            }}
          />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.9rem' }}>
          <Link href="/" style={navLinkStyle}>
            Catalogue
          </Link>
          {user ? (
            <>
              <Link href="/profile" style={navLinkStyle}>
                Profile
              </Link>
              <form action={logoutAction} style={{ margin: 0 }}>
                <button
                  type="submit"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: BRAND.mute,
                    fontFamily: FONT.sans,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" style={navLinkStyle}>
                Sign in
              </Link>
              <Link
                href="/register"
                style={{
                  ...navLinkStyle,
                  color: BRAND.coral,
                  fontWeight: 500,
                }}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

const navLinkStyle: React.CSSProperties = {
  color: BRAND.slate,
  textDecoration: 'none',
}
