// Server component. Recent purchases — what's selling, who's buying, when.
// Replaces the previous "Recent products" table since the demo story is
// closer to "this is what's moving" than "this is what's in stock."

import React from 'react'
import Link from 'next/link'

type Row = {
  id: string
  productTitle: string
  productIcon: string
  productSlug: string | null
  buyerEmail: string
  buyerName: string | null
  priceAtPaid: number
  currency: string
  purchasedAt: string
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

export default function RecentPurchasesTable({ rows, ink, mute, hairline, coral }: Props) {
  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, padding: '1.5rem 0', color: mute, textAlign: 'center', fontSize: '0.9rem' }}>
        No purchases yet. Have someone buy something from the{' '}
        <Link href="/" style={{ color: coral, textDecoration: 'none' }}>
          storefront
        </Link>{' '}
        — or seed one through the admin.
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
            <th style={headerCell}>Product</th>
            <th style={headerCell}>Buyer</th>
            <th style={{ ...headerCell, textAlign: 'right' }}>Paid</th>
            <th style={{ ...headerCell, textAlign: 'right' }}>When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...cell, fontSize: '1.25rem' }}>{r.productIcon}</td>
              <td style={{ ...cell, color: ink, fontWeight: 500 }}>
                {r.productSlug ? (
                  <Link
                    href={`/admin/collections/products?where[slug][equals]=${encodeURIComponent(r.productSlug)}`}
                    style={{ color: ink, textDecoration: 'none' }}
                  >
                    {r.productTitle}
                  </Link>
                ) : (
                  r.productTitle
                )}
              </td>
              <td style={cell}>
                <div style={{ color: ink, fontSize: '0.9rem' }}>{r.buyerName ?? r.buyerEmail}</div>
                {r.buyerName ? (
                  <div style={{ color: mute, fontSize: '0.75rem' }}>{r.buyerEmail}</div>
                ) : null}
              </td>
              <td
                style={{
                  ...cell,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: r.priceAtPaid === 0 ? mute : coral,
                  fontWeight: 500,
                }}
              >
                {r.priceAtPaid === 0 ? 'Free' : `${r.priceAtPaid.toFixed(2)} ${r.currency.toUpperCase()}`}
              </td>
              <td style={{ ...cell, textAlign: 'right', color: mute, fontVariantNumeric: 'tabular-nums' }}>
                {relative(r.purchasedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
