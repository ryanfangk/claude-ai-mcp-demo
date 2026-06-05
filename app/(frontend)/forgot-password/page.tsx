import Link from 'next/link'
import { BRAND, STYLES, FONT } from '@/lib/brand'
import { forgotPasswordAction } from '@/app/(frontend)/_actions/auth'
import AuthForm, { Field } from '@/app/(frontend)/_components/AuthForm'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 440 }}>
      <h1 style={STYLES.pageHeading}>Reset your password</h1>
      <p style={STYLES.pageSubtitle}>
        Enter the email on your account. We&apos;ll send a reset link.
      </p>

      <div style={STYLES.card}>
        <AuthForm action={forgotPasswordAction} submitLabel="Send reset link">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
        </AuthForm>
      </div>

      <p
        style={{
          marginTop: '1rem',
          fontSize: '0.8rem',
          color: BRAND.mute,
          fontFamily: FONT.sans,
        }}
      >
        Demo note: no email adapter is wired, so the reset link will print to the dev-server
        console rather than land in an inbox.
      </p>

      <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: BRAND.mute, fontFamily: FONT.sans }}>
        <Link href="/login" style={{ color: BRAND.coral, textDecoration: 'none' }}>
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
