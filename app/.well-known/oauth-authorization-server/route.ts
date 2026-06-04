import { NextResponse } from 'next/server'
import { workosAuthkitDomain } from '@/lib/workos'

// RFC 8414 OAuth Authorization Server Metadata — backwards-compatibility for
// MCP clients that fetch AS metadata directly from the MCP server origin
// instead of following /.well-known/oauth-protected-resource (RFC 9728).
// Claude.ai web is such a client.
//
// We are the *resource* server, not the authorization server: this endpoint
// proxies WorkOS AuthKit's own metadata verbatim, so the client discovers
// AuthKit's endpoints (/oauth2/authorize, /oauth2/token, /oauth2/register,
// /oauth2/jwks) and runs the OAuth flow against AuthKit — never against this
// origin. Without it, such clients fall back to constructing /authorize on
// this origin, which 404s.
// Ref: https://workos.com/docs/authkit/mcp ("some clients may not support
// Protected Resource Metadata ... proxy AuthKit's authorization server metadata")
//
// `workosAuthkitDomain` is pre-normalized by lib/workos.ts (https:// prepended
// if missing, trailing slash stripped) so a bare-host env var doesn't break
// the upstream fetch.
export async function GET() {
  if (!workosAuthkitDomain) {
    return NextResponse.json({ error: 'authorization server not configured' }, { status: 404 })
  }

  const upstreamUrl = `${workosAuthkitDomain}/.well-known/oauth-authorization-server`
  try {
    const upstream = await fetch(upstreamUrl, {
      // AuthKit metadata is stable; cache briefly rather than hit it per request.
      next: { revalidate: 3600 },
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'failed to fetch authorization server metadata', upstream: upstreamUrl, status: upstream.status },
        { status: 502 },
      )
    }
    // Mirror AuthKit's document as-is — issuer + endpoints point at the
    // AuthKit domain, which is exactly where the client must run the OAuth flow.
    const metadata = await upstream.json()
    return NextResponse.json(metadata)
  } catch (err) {
    // Surface the attempted URL and the underlying message so operators don't
    // have to spelunk Vercel logs to diagnose a config error.
    return NextResponse.json(
      {
        error: 'failed to reach authorization server',
        upstream: upstreamUrl,
        cause: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    )
  }
}
