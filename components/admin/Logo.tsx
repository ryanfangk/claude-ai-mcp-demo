// Pop-up Shop brand logo, rendered on the Payload admin login splash.
//
// Wired in payload.config.ts as admin.components.graphics.Logo. Receives
// no Payload-specific props beyond the standard ServerProps (per Payload
// v3's PayloadComponent type) — kept side-effect-free so it can render as
// a React Server Component.
//
// The brand reads as: a serif wordmark in ink, a coral disc immediately
// after, sized to the wordmark's x-height. The disc is intentionally bare
// — it reads as a price tag, a button, a stage light.

import React from 'react'

export default function Logo() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.4rem',
        padding: '0.5rem 0',
      }}
    >
      <span
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: '2.5rem',
          lineHeight: 1,
          color: 'var(--brand-ink, #0b0d10)',
          letterSpacing: '-0.01em',
        }}
      >
        pop-up shop
      </span>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: '0.7rem',
          height: '0.7rem',
          borderRadius: '999px',
          background: 'var(--brand-coral, #f25f3b)',
          alignSelf: 'center',
          marginBottom: '0.4rem',
        }}
      />
    </div>
  )
}
