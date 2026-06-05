// Headline KPI tile. Server component — receives pre-computed strings and
// renders one fixed shape: small slate label on top, big serif number below,
// thin accent rule.

import React from 'react'

type Props = {
  label: string
  value: string
  accent: string
}

export default function StatTile({ label, value, accent }: Props) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.25rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          height: '3px',
          background: accent,
        }}
      />
      <div
        style={{
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: '#6b7280',
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-brand-serif, Georgia, serif)',
          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          lineHeight: 1.1,
          color: '#0b0d10',
          fontWeight: 400,
        }}
      >
        {value}
      </div>
    </div>
  )
}
