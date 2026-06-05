import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND, STYLES, FONT } from '@/lib/brand'
import { getSessionUser } from '@/lib/auth'
import { loginAction } from '@/app/(frontend)/_actions/auth'
import AuthForm, { Field } from '@/app/(frontend)/_components/AuthForm'

export const dynamic = 'force-dynamic'

type Search = { registered?: string; reset?: string }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  // Already logged in? Don't show the sign-in form — bounce to profile.
  const sessionUser = await getSessionUser()
  if (sessionUser) redirect('/profile')

  const sp = await searchParams
  const initialNotice = sp.registered
    ? 'Account created — sign in with your new credentials.'
    : sp.reset
      ? 'Password updated — sign in with your new password.'
      : undefined

  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 440 }}>
      <h1 style={STYLES.pageHeading}>Sign in</h1>
      <p style={STYLES.pageSubtitle}>Use the email and password you registered with.</p>

      <div style={STYLES.card}>
        <AuthForm action={loginAction} submitLabel="Sign in" initialNotice={initialNotice}>
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </AuthForm>
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: BRAND.mute, fontFamily: FONT.sans }}>
        <Link href="/forgot-password" style={{ color: BRAND.coral, textDecoration: 'none' }}>
          Forgot your password?
        </Link>
        <span style={{ margin: '0 0.5rem', color: BRAND.hairline }}>·</span>
        New here?{' '}
        <Link href="/register" style={{ color: BRAND.coral, textDecoration: 'none' }}>
          Create an account
        </Link>
      </div>
    </main>
  )
}
