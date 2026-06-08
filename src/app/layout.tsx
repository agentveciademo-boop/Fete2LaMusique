import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

// Système typographique « encre + solstice » (refonte UX 2026-06) :
// Display = Bricolage Grotesque (titres, gros chiffres) ; UI = Hanken Grotesk
// (libellés, descriptions, boutons) ; Mono = Space Mono (heures, distances, compteurs).
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' })
const ui      = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-sans' })
const mono    = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Fête de la Musique Paris 2026',
  description: 'Carte interactive des concerts du 21 juin à Paris',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FdlM Paris',
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0913',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={cn("h-full", "antialiased", "font-sans", display.variable, ui.variable, mono.variable)}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
