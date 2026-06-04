import { type NextRequest, NextResponse } from 'next/server'

// Next.js 16 edge proxy (formerly middleware.ts). Single job in this demo:
// kick off the OAuth discovery flow for Claude.ai web on /api/mcp.
//
// When WorkOS is configured (WORKOS_AUTHKIT_DOMAIN set) and a request hits
// /api/mcp with no Bearer token, return a 401 carrying a
// `WWW-Authenticate: Bearer ... resource_metadata="..."` header per RFC 9728 /
// MCP authorization spec. The client (Claude.ai web) then fetches the
// resource_metadata URL → discovers the authorization server (AuthKit) →
// runs the OAuth flow → comes back with a Bearer token.
//
// Token-carrying requests (Claude Code static key OR a WorkOS OAuth token)
// fall straight through to the plugin's @payloadcms/plugin-mcp handler,
// which validates them via mcpOverrideAuth in lib/workos.ts.
//
// When WorkOS is NOT configured, this proxy does nothing — the plugin's
// default per-API-key auth handles unauthenticated requests with its own 401.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/api/mcp' || pathname.startsWith('/api/mcp/')) {
    const hasBearer = (request.headers.get('authorization') ?? '').startsWith('Bearer ')
    if (!hasBearer && process.env.WORKOS_AUTHKIT_DOMAIN) {
      const metadataUrl = `${request.nextUrl.origin}/.well-known/oauth-protected-resource`
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Authorization needed' },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': `Bearer error="unauthorized", error_description="Authorization needed", resource_metadata="${metadataUrl}"`,
          },
        },
      )
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/mcp', '/api/mcp/:path*'],
}
