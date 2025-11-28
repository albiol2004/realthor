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
import superjson from 'superjson'

// ... imports

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Desktop-app-like responsiveness settings
            staleTime: 1000 * 10, // 10 seconds - data is fresh for this long
            gcTime: 1000 * 60 * 5, // 5 minutes - cache persists for this long
            refetchOnWindowFocus: true, // Refetch when window regains focus
            refetchOnReconnect: true, // Refetch when internet reconnects
            retry: 1, // Only retry failed requests once (faster failure feedback)
            retryDelay: 500, // 500ms between retries
            networkMode: 'offlineFirst', // Use cache while network request is pending
          },
          mutations: {
            retry: 0, // Don't retry mutations (avoid duplicate operations)
            networkMode: 'online', // Only run mutations when online
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
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
