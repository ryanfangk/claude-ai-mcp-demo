// Pop-up Shop brand mark for the Payload admin nav header (top-left,
// next to the dashboard/collection links).
//
// Wired in payload.config.ts as admin.components.graphics.Icon. Stripped-
// down version of the login Logo — just the coral disc, sized to fit the
// nav slot. Reads as a small badge / favicon-equivalent at admin scale.

import React from 'react'

export default function Icon() {
  return (
    <span
      aria-label="Pop-up Shop"
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.75rem',
        height: '1.75rem',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: '0.95rem',
          height: '0.95rem',
          borderRadius: '999px',
          background: 'var(--brand-coral, #f25f3b)',
        }}
      />
    </span>
  )
}
