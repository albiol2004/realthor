'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from './client'

/**
 * Get the base URL for tRPC API calls
 * Works in both development and production
 */
function getBaseUrl() {
  // Browser: use relative path
  if (typeof window !== 'undefined') return ''

  // SSR: Use Vercel URL if available
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  // SSR: Use custom domain if set
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL

  // Development fallback
  return 'http://localhost:3000'
}

/**
 * tRPC Provider for React
 *
 * Wraps the app with tRPC and React Query providers
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          // You can pass any HTTP headers you wish here
          async headers() {
            return {}
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
