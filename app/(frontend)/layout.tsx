import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'

// Self-host the brand fonts (next/font handles the CSS, the preload, and the
// FOIT-vs-FOUT trade-off). Two CSS variables on <body> so the storefront
// stylesheet can read them by name instead of hard-coding the family.
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-brand-sans',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-brand-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pop-up Shop — claude ai mcp demo',
  description: 'A pop-up storefront, ready to go. Plug in a catalogue, point an agent at it, demo it on a screen.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: 'var(--font-brand-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          color: '#0b0d10',
          background: '#ffffff',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </body>
    </html>
  )
}
