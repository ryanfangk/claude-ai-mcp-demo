import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND, STYLES, FONT } from '@/lib/brand'
import { getSessionUser } from '@/lib/auth'
import { registerAction } from '@/app/(frontend)/_actions/auth'
import AuthForm, { Field } from '@/app/(frontend)/_components/AuthForm'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const sessionUser = await getSessionUser()
  if (sessionUser) redirect('/profile')

  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 440 }}>
      <h1 style={STYLES.pageHeading}>Create an account</h1>
      <p style={STYLES.pageSubtitle}>One minute. No verification email — demo project.</p>

      <div style={STYLES.card}>
        <AuthForm action={registerAction} submitLabel="Create account">
          <Field label="Name (optional)" name="name" autoComplete="name" placeholder="Sam Buyer" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            helper="At least 8 characters."
          />
        </AuthForm>
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: BRAND.mute, fontFamily: FONT.sans }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: BRAND.coral, textDecoration: 'none' }}>
          Sign in
        </Link>
      </div>
    </main>
  )
}
