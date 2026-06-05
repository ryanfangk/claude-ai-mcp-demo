'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { clearSessionCookie, getPayloadInstance, setSessionCookie } from '@/lib/auth'

// All auth Server Actions live here. Each one:
//  1. Pulls form fields off `formData`
//  2. Talks to Payload's Local API (no fetch indirection)
//  3. Returns a { error: string } shape on failure so the form re-renders
//     with the message
//  4. On success, redirects to a known landing page
//
// Why Server Actions instead of `/api/users/login` POSTs: forms work without
// client-side JavaScript, the session cookie is set on the same response
// that handles the form, and the server has direct access to the Local API
// + cookies without round-tripping through fetch + CSRF tokens.

type ActionState = { error?: string; notice?: string } | undefined

// Cookie lifetime mirrors Payload's user-collection tokenExpiration.
// Hard-coded to 7 days; if you change the Users collection's
// tokenExpiration, change this too.
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function requireString(formData: FormData, field: string): string | null {
  const v = formData.get(field)
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = requireString(formData, 'email')
  const password = requireString(formData, 'password')
  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const payload = await getPayloadInstance()
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    if (!result.token) {
      // Payload returned 200 without a token (depth-related edge case).
      return { error: 'Sign-in succeeded but no session was issued. Try again.' }
    }
    await setSessionCookie(result.token, SESSION_MAX_AGE)
  } catch {
    // Generic message — never leak whether the email exists. The reference
    // for this is .claude/rules/payload-conventions.md ("Exception —
    // security-sensitive validation rejects generically").
    return { error: 'That email and password did not match. Try again.' }
  }
  redirect('/profile')
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = requireString(formData, 'email')
  const password = requireString(formData, 'password')
  const name = formData.get('name')
  const nameValue = typeof name === 'string' ? name.trim() : ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const payload = await getPayloadInstance()
  try {
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        ...(nameValue ? { name: nameValue } : {}),
      },
      overrideAccess: true,
    })
  } catch (err) {
    // The most common case is "duplicate email" — Payload surfaces it as
    // ValidationError. Anything else is a real bug.
    const msg = err instanceof Error ? err.message : String(err)
    if (/email/i.test(msg) && /(unique|exists|taken)/i.test(msg)) {
      return { error: 'An account with that email already exists. Try signing in instead.' }
    }
    return { error: 'Something went wrong creating your account. Try again.' }
  }

  // Auto-login after register so the user lands on their (empty) profile
  // ready to buy.
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    if (result.token) await setSessionCookie(result.token, SESSION_MAX_AGE)
  } catch {
    // Account exists but auto-login failed (very unlikely). Push to /login
    // with a notice rather than swallowing.
    redirect('/login?registered=1')
  }
  redirect('/profile')
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = requireString(formData, 'email')
  if (!email) {
    return { error: 'Email is required.' }
  }
  const payload = await getPayloadInstance()
  try {
    await payload.forgotPassword({
      collection: 'users',
      data: { email },
      // Payload's default behavior is to email the user; the demo doesn't
      // wire an email adapter, so the reset link goes to the dev server log
      // ("No email adapter provided. Email will be written to console.").
      // For a demo that's fine — the operator follows the link from there.
    })
  } catch {
    // Don't leak "no such email" — always succeed at the UI layer.
  }
  return { notice: "If an account exists for that email, we've sent a reset link." }
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = requireString(formData, 'token')
  const password = requireString(formData, 'password')
  if (!token || !password) {
    return { error: 'Token and new password are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  const payload = await getPayloadInstance()
  try {
    const result = await payload.resetPassword({
      collection: 'users',
      data: { token, password },
      overrideAccess: true,
    })
    if (result.token) await setSessionCookie(result.token, SESSION_MAX_AGE)
  } catch {
    return { error: 'That reset link is invalid or has expired. Request a new one.' }
  }
  redirect('/profile')
}
