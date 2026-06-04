import { NextResponse } from 'next/server'
import { mcpResourceUrl, workosAuthkitDomain } from '@/lib/workos'

// RFC 9728 OAuth Protected Resource Metadata. An MCP client (Claude.ai web)
// fetches this — pointed here by the WWW-Authenticate header on a 401 from
// /api/mcp (set in proxy.ts) — to discover which authorization server backs
// the MCP resource, then runs the OAuth flow against it.
// Ref: https://workos.com/docs/authkit/mcp
//
// `resource` and `authorization_servers` come pre-normalized from lib/workos.ts
// (https:// prepended, trailing slash stripped) so bare-host env vars don't
// emit bare-host URLs into the discovery document.
export function GET() {
  return NextResponse.json({
    resource: mcpResourceUrl,
    authorization_servers: workosAuthkitDomain ? [workosAuthkitDomain] : [],
    bearer_methods_supported: ['header'],
  })
}
