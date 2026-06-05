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
//
// Use an explicit set('', maxAge: 0) instead of cookies().delete(): the
// delete shortcut doesn't always emit a Set-Cookie header that matches the
// attributes the cookie was set with, so the browser keeps the old cookie
// alive and the next request still authenticates. Mirror every attribute
// from setSessionCookie() exactly — same path, same flags — so the
// browser's (name, path, domain) match is identical.
export async function clearSessionCookie() {
  const jar = await nextCookies()
  jar.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
}

// Returns the currently-authenticated principal regardless of collection
// (admins, users, mcp-agents, payload-mcp-api-keys), or null when anonymous.
// Used by surfaces that need to react to "any session" — e.g. hiding the
// "Open admin" CTA for shoppers, who would otherwise click it and be
// bounced to /admin/unauthorized by Payload.
//
// Most call sites should prefer getSessionUser() (storefront-narrowed).
// Reach for this only when you care that *someone* is logged in.
export async function getAnyAuthSession(): Promise<{
  user: { id: string | number; collection: string; email?: string } | null
}> {
  const payload = await getPayloadInstance()
  const h = await nextHeaders()
  const { user } = await payload.auth({ headers: h as unknown as Headers })
  if (!user) return { user: null }
  return {
    user: {
      id: user.id as string | number,
      collection: (user as { collection?: string }).collection ?? 'unknown',
      email: (user as { email?: string }).email,
    },
  }
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
