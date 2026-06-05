import Link from 'next/link'
import { BRAND, STYLES, FONT } from '@/lib/brand'
import { resetPasswordAction } from '@/app/(frontend)/_actions/auth'
import AuthForm, { Field } from '@/app/(frontend)/_components/AuthForm'

export const dynamic = 'force-dynamic'

type Search = { token?: string }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams
  const token = typeof sp.token === 'string' ? sp.token : ''

  if (!token) {
    return (
      <main style={{ ...STYLES.pageMain, maxWidth: 440 }}>
        <h1 style={STYLES.pageHeading}>Reset link missing</h1>
        <p style={STYLES.pageSubtitle}>
          Reset links look like <code>/reset-password?token=…</code>. Use the link from your email
          or{' '}
          <Link href="/forgot-password" style={{ color: BRAND.coral, textDecoration: 'none' }}>
            request a new one
          </Link>
          .
        </p>
      </main>
    )
  }

  return (
    <main style={{ ...STYLES.pageMain, maxWidth: 440 }}>
      <h1 style={STYLES.pageHeading}>Choose a new password</h1>
      <p style={STYLES.pageSubtitle}>
        Pick something you&apos;ll remember. You&apos;ll be signed in afterwards.
      </p>

      <div style={STYLES.card}>
        <AuthForm action={resetPasswordAction} submitLabel="Set new password">
          {/* Token rides along as a hidden field — the Server Action reads it
              from formData and passes it to payload.resetPassword. */}
          <input type="hidden" name="token" value={token} />
          <Field
            label="New password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            helper="At least 8 characters."
          />
        </AuthForm>
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: BRAND.mute, fontFamily: FONT.sans }}>
        <Link href="/login" style={{ color: BRAND.coral, textDecoration: 'none' }}>
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
