import { initTRPC } from '@trpc/server'
import { type Context } from './context'

/**
 * tRPC Server Setup
 *
 * Initializes tRPC with context
 *
 * Phase 1: Basic setup without superjson
 * Phase 2+: Can add superjson for Date/Map/Set support if needed
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape
  },
})

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure (requires authentication)
 * Phase 1: Placeholder - allows all requests
 * Phase 2: Will check for valid session
 */
export const protectedProcedure = t.procedure
  // TODO Phase 1: Add auth middleware
  // .use(async ({ ctx, next }) => {
  //   if (!ctx.user) {
  //     throw new TRPCError({ code: 'UNAUTHORIZED' })
  //   }
  //   return next({ ctx: { ...ctx, user: ctx.user } })
  // })
