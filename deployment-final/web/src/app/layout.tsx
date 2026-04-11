import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TankID.io - Universal Storage Tank Registry | AST & UST Compliance',
  description: 'The universal registry for above ground and underground storage tanks. Scan the QR label for full tank specs in seconds. No app download required.',
  keywords: 'storage tank, UST, AST, compliance, tank registry, QR code, field technicians, facility management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}