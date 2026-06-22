import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthWrapper from './auth-wrapper'
import SwRegister from '../components/SwRegister'

export const metadata: Metadata = {
  title: 'Pipz - 陪你每一步',
  description: '行路養寵物，每一步都係新發現',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Pipz',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b1120',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>
        <AuthWrapper>{children}</AuthWrapper>
        <SwRegister />
      </body>
    </html>
  )
}
