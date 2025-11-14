import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Get app URL from request headers
 * Uses the request origin to automatically work in any environment
 */
function getAppUrl(req: Request): string {
  // Try to get from environment variable first (useful for local dev)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl !== 'http://localhost:3000') {
    return envUrl
  }

  // Get from request headers (works in all deployed environments)
  const host = req.headers.get('host')
  const protocol = req.headers.get('x-forwarded-proto') || 'https'

  if (host) {
    return `${protocol}://${host}`
  }

  // Fallback to localhost for local development
  return 'http://localhost:3000'
}

/**
 * tRPC Context
 *
 * Creates context for each tRPC request
 * Includes authenticated user information from Supabase
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    req: opts.req,
    user: user ?? null,
    supabase,
    appUrl: getAppUrl(opts.req),
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
