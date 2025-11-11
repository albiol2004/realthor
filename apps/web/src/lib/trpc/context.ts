import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

/**
 * tRPC Context
 *
 * Creates context for each tRPC request
 *
 * Phase 1: Basic context with request info
 * Phase 2+: Will include user session from Supabase Auth
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  // TODO Phase 1: Add Supabase session
  // const supabase = createServerClient()
  // const { data: { session } } = await supabase.auth.getSession()

  return {
    req: opts.req,
    // user: session?.user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
