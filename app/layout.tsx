import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solardisunenergy.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'DiSun Energy International | Solar Power Calculator',
  description: 'Calculate solar power requirements, review KSEB transformer feasibility, and start your solar installation journey with DiSun Energy International.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'DiSun Energy International | Solar Power Calculator',
    description: 'Solar power calculator and KSEB transformer feasibility for Kerala customers.',
    siteName: 'DiSun Energy International',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiSun Energy International | Solar Power Calculator',
    description: 'Solar power calculator and KSEB transformer feasibility for Kerala customers.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'dark',
  themeColor: '#020f25',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

