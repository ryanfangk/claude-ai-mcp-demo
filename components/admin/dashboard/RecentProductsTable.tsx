// Server component. Plain HTML table — Payload's admin UI library has its
// own Table primitive but it's tied to collection-list specifics. A
// hand-rolled table keeps the styling on-brand and avoids dragging that
// dependency into custom dashboard scope.

import React from 'react'
import Link from 'next/link'

type Row = {
  id: string
  title: string
  category: string | null
  price: number
  currency: string
  icon: string
  createdAt: string
}

type Props = {
  rows: Row[]
  ink: string
  mute: string
  hairline: string
  coral: string
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'just now'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  return `${day} days ago`
}

export default function RecentProductsTable({ rows, ink, mute, hairline, coral }: Props) {
  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, padding: '1.5rem 0', color: mute, textAlign: 'center', fontSize: '0.9rem' }}>
        No products yet. Create one through the admin or ask Claude to call{' '}
        <code style={{ color: coral }}>createManyProducts</code>.
      </p>
    )
  }

  const cell: React.CSSProperties = {
    padding: '0.75rem 0.75rem',
    borderBottom: `1px solid ${hairline}`,
    fontSize: '0.9rem',
    textAlign: 'left',
    verticalAlign: 'middle',
  }
  const headerCell: React.CSSProperties = {
    ...cell,
    fontSize: '0.7rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: mute,
    fontWeight: 500,
    paddingBottom: '0.5rem',
    borderBottom: `1px solid ${hairline}`,
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...headerCell, width: '2rem' }} />
            <th style={headerCell}>Title</th>
            <th style={headerCell}>Category</th>
            <th style={{ ...headerCell, textAlign: 'right' }}>Price</th>
            <th style={{ ...headerCell, textAlign: 'right' }}>Added</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...cell, fontSize: '1.25rem' }}>{r.icon}</td>
              <td style={{ ...cell, color: ink, fontWeight: 500 }}>
                <Link
                  href={`/admin/collections/products/${r.id}`}
                  style={{ color: ink, textDecoration: 'none' }}
                >
                  {r.title}
                </Link>
              </td>
              <td style={{ ...cell, color: mute, textTransform: 'capitalize' }}>{r.category ?? '—'}</td>
              <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.price === 0 ? mute : ink }}>
                {r.price === 0 ? 'Free' : `${r.price.toFixed(2)} ${r.currency.toUpperCase()}`}
              </td>
              <td style={{ ...cell, textAlign: 'right', color: mute, fontVariantNumeric: 'tabular-nums' }}>
                {relative(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
