import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'claude ai mcp demo',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
