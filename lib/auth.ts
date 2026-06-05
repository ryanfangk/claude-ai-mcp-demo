import 'server-only'
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers'
import { getPayload } from 'payload'
import type { Payload, PayloadRequest, User } from 'payload'
import config from '@payload-config'

// Storefront session helpers.
//
// Payload v3 issues a JWT cookie (`payload-token` by default) on successful
// login and reads it back via `payload.auth({ headers })`. These helpers
// wrap that so storefront Server Components, Server Actions, and route
// handlers all read identity the same way — and so the rest of the app
// never has to know the cookie name.
//
// Why a wrapper instead of `payload.auth(...)` everywhere:
// - One place to change if the auth scheme moves (sessions, SSR cache, etc.)
// - Type-narrows to "the user is in `users`" before returning — admins and
//   mcp-agents who happen to be logged in to a different collection will not
//   leak into the storefront's identity surface.
// - Clears the cookie name on logout in one place so call sites don't have
//   to hard-code it.

export async function getPayloadInstance(): Promise<Payload> {
  return getPayload({ config })
}

// Returns the currently-authenticated storefront user, or null.
// Authentication scoped to the `users` collection — a token issued for
// `admins` or `mcp-agents` will return null here on purpose.
export async function getSessionUser(): Promise<User | null> {
  const payload = await getPayloadInstance()
  const h = await nextHeaders()
  const { user } = await payload.auth({ headers: h as unknown as Headers })
  if (!user) return null
  if ((user as { collection?: string }).collection !== 'users') return null
  return user as unknown as User
}

// For server actions that need both the user AND the Payload instance
// (login flow, profile edit, checkout). One round-trip.
export async function getSessionContext(): Promise<{
  payload: Payload
  user: User | null
  req: Pick<PayloadRequest, 'user'>
}> {
  const payload = await getPayloadInstance()
  const h = await nextHeaders()
  const { user } = await payload.auth({ headers: h as unknown as Headers })
  const scoped =
    user && (user as { collection?: string }).collection === 'users'
      ? (user as unknown as User)
      : null
  return { payload, user: scoped, req: { user: scoped as PayloadRequest['user'] } }
}

// Default Payload session-cookie name. Centralized so a future switch (e.g.
// to per-collection cookie names) flips one place.
export const SESSION_COOKIE_NAME = 'payload-token'

// Clear the session cookie — used by the logout action.
// Server Action only (cookies() mutation throws outside that context).
export async function clearSessionCookie() {
  const jar = await nextCookies()
  jar.delete(SESSION_COOKIE_NAME)
}

// Set the session cookie from a Payload login result. Payload's `login()`
// returns a `token` — we set it on the response cookie so subsequent
// requests are authenticated.
export async function setSessionCookie(token: string, maxAgeSeconds: number) {
  const jar = await nextCookies()
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}
