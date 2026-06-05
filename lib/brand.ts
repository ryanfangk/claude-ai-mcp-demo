// Pop-up Shop brand tokens. Mirror of the design-token block in
// docs/reference/branding-guideline/brand-guidelines.md so any storefront
// component can `import { BRAND } from '@/lib/brand'` instead of
// hand-copying hex values. Centralization also means a brand re-skin is
// one file edit.
//
// The Payload admin reads the same values via CSS variables in
// app/(payload)/custom.scss — kept in sync by hand because the admin
// custom.scss is loaded as a static stylesheet, not by JS import.

export const BRAND = {
  coral: '#f25f3b',
  coralDark: '#c44324',
  indigo: '#1e1b4b',
  ink: '#0b0d10',
  slate: '#3a3e47',
  mute: '#6b7280',
  hairline: '#e5e7eb',
  surface: '#f8f9fa',
  canvas: '#ffffff',

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const

export const FONT = {
  sans: 'var(--font-brand-sans), -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  serif: 'var(--font-brand-serif), Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const

// Reusable inline style fragments. Server components compose these into
// their `style={}` props — keeps per-component style blocks short and
// makes "the primary button looks slightly different on different pages"
// regressions impossible.
export const STYLES = {
  pageMain: {
    maxWidth: 880,
    margin: '0 auto',
    padding: '3rem 1.5rem 6rem',
    fontFamily: FONT.sans,
    color: BRAND.ink,
  } as React.CSSProperties,
  card: {
    background: BRAND.canvas,
    border: `1px solid ${BRAND.hairline}`,
    borderRadius: '0.75rem',
    padding: '1.5rem',
  } as React.CSSProperties,
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.65rem 1.4rem',
    borderRadius: '999px',
    background: BRAND.coral,
    color: BRAND.canvas,
    fontWeight: 500,
    textDecoration: 'none',
    border: `1px solid ${BRAND.coral}`,
    cursor: 'pointer',
    fontFamily: FONT.sans,
    fontSize: '0.95rem',
  } as React.CSSProperties,
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.65rem 1.4rem',
    borderRadius: '999px',
    background: 'transparent',
    color: BRAND.indigo,
    fontWeight: 500,
    textDecoration: 'none',
    border: `1px solid ${BRAND.indigo}`,
    cursor: 'pointer',
    fontFamily: FONT.sans,
    fontSize: '0.95rem',
  } as React.CSSProperties,
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.7rem 0.9rem',
    fontFamily: FONT.sans,
    fontSize: '1rem',
    color: BRAND.ink,
    background: BRAND.canvas,
    border: `1px solid ${BRAND.hairline}`,
    borderRadius: '0.5rem',
    outline: 'none',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontFamily: FONT.sans,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: BRAND.slate,
    marginBottom: '0.35rem',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  errorBox: {
    background: '#fef2f2',
    border: `1px solid #fecaca`,
    color: '#991b1b',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  noticeBox: {
    background: BRAND.surface,
    border: `1px solid ${BRAND.hairline}`,
    color: BRAND.slate,
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  pageHeading: {
    fontFamily: FONT.serif,
    fontWeight: 400,
    fontSize: 'clamp(2rem, 5vw, 2.8rem)',
    lineHeight: 1.1,
    letterSpacing: '-0.01em',
    color: BRAND.ink,
    margin: '0 0 0.5rem',
  } as React.CSSProperties,
  pageSubtitle: {
    fontFamily: FONT.sans,
    fontSize: '1.05rem',
    lineHeight: 1.5,
    color: BRAND.slate,
    margin: '0 0 2rem',
  } as React.CSSProperties,
} as const
