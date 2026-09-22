import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { WalletProvider } from '@/lib/wallet-context'
import { NotificationProvider } from '@/lib/notification-context'
import { AppUnlockModal } from '@/components/app-unlock-modal'
import { PersistentBotFrame } from '@/components/persistent-bot-frame'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://orion-multiwallet.xyz'),
  title: 'Orion - Stellar Lumens Multiwallet',
  description: 'Create or import your first Stellar wallet. Your keys are encrypted locally and never leave your device.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Orion - Stellar Lumens Multiwallet',
    description: 'Create or import your first Stellar wallet. Your keys are encrypted locally and never leave your device.',
    url: 'https://orion-multiwallet.xyz',
    siteName: 'Orion - Stellar Lumens Multiwallet',
    type: 'website',
    images: [
      {
        url: '/orion-social-preview.png',
        width: 1408,
        height: 768,
        alt: 'Orion Stellar Lumens Wallet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orion - Stellar Lumens Multiwallet',
    description: 'Create or import your first Stellar wallet. Your keys are encrypted locally and never leave your device.',
    images: ['/orion-social-preview.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Orion - Stellar Lumens Multiwallet',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#0a0e27',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased bg-background text-foreground">
        <WalletProvider>
          <NotificationProvider>
            <AppUnlockModal />
            {children}
            <PersistentBotFrame />
          </NotificationProvider>
        </WalletProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
