import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 50,
    sort: '-createdAt',
  })

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>claude ai mcp demo</h1>
      <p>
        Admin: <Link href="/admin">/admin</Link> · MCP endpoint:{' '}
        <code>/api/mcp</code> (Streamable HTTP){' '}
        {process.env.MCP_ENABLED === 'true' ? '✓ enabled' : '✗ disabled (set MCP_ENABLED=true)'}
      </p>
      <h2>Products ({docs.length})</h2>
      {docs.length === 0 ? (
        <p style={{ color: '#666' }}>None yet. Create one in the admin or via the MCP createManyProducts tool.</p>
      ) : (
        <ul>
          {docs.map((p) => (
            <li key={p.id}>
              <strong>{p.icon ?? '📄'} {p.title}</strong> — {p.category} ·{' '}
              {p.price === 0 ? 'free' : `${p.price.toFixed(2)} ${p.currency.toUpperCase()}`}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
