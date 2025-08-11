import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/lib/providers'
import { Navigation } from '@/components/ui/navigation'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Contract Stresser',
    default: 'Contract Stresser - Smart Contract Testing Platform',
  },
  description: 'A lightweight web application for stress-testing Ethereum smart contracts with performance analytics and visualization.',
  keywords: ['ethereum', 'smart contracts', 'testing', 'ERC-20', 'blockchain', 'stress testing'],
  authors: [{ name: 'Contract Stresser Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className={`${inter.className} bg-white text-gray-950`}>
        <ErrorBoundary>
          <Providers>
            <div className="flex min-h-screen flex-col bg-background">
              <Navigation />
              <main className="flex-1">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}