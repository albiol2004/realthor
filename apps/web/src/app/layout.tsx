import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { TRPCProvider } from '@/lib/trpc/Provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kairo - Real Estate CRM & Document Management Platform',
  description: 'Complete real estate management platform for agents and agencies. CRM, document intelligence, compliance tracking, and unified communications—all in one cloud-based workspace.',
  keywords: [
    'real estate CRM',
    'real estate software',
    'real estate document management',
    'property management software',
    'real estate agent tools',
    'real estate compliance',
    'real estate cloud storage',
    'real estate communications',
    'transaction management',
    'real estate platform'
  ],
  authors: [{ name: 'Kairo Solutions' }],
  creator: 'Kairo Solutions',
  publisher: 'Kairo Solutions',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kairosolutions.eu',
    title: 'Kairo - Real Estate Operating System',
    description: 'The only platform real estate professionals need. Manage clients, documents, and deals in one place.',
    siteName: 'Kairo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kairo - Real Estate Operating System',
    description: 'Complete workspace for real estate agents. CRM, documents, and communications unified.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster />
      </body>
    </html>
  )
}
