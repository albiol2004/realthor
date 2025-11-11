import { router, publicProcedure } from '@/lib/trpc/server'
import { z } from 'zod'

/**
 * Auth Router
 *
 * Handles authentication-related operations
 *
 * Phase 1: Placeholder endpoints
 * Phase 2: Implement Supabase auth integration
 */
export const authRouter = router({
  /**
   * Get current session
   * Phase 1: Returns null (no auth yet)
   */
  getSession: publicProcedure.query(async () => {
    // TODO Phase 1: Implement Supabase session check
    // const supabase = createServerClient()
    // const { data: { session } } = await supabase.auth.getSession()
    // return session

    return null
  }),

  /**
   * Sign in
   * Phase 1: Placeholder
   */
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      // TODO Phase 1: Implement Supabase auth
      throw new Error('Authentication not yet implemented')
    }),

  /**
   * Sign up
   * Phase 1: Placeholder
   */
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      // TODO Phase 1: Implement Supabase auth
      throw new Error('Authentication not yet implemented')
    }),

  /**
   * Sign out
   * Phase 1: Placeholder
   */
  signOut: publicProcedure.mutation(async () => {
    // TODO Phase 1: Implement Supabase auth
    throw new Error('Authentication not yet implemented')
  }),
})
