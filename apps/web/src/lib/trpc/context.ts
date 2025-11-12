import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

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
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
