import { initTRPC, TRPCError } from '@trpc/server'
import { type Context } from './context'

/**
 * tRPC Server Setup
 *
 * Initializes tRPC with context
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

/**
 * Public procedure - accessible without authentication
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 * Throws UNAUTHORIZED error if user is not authenticated
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Ensures user is non-null in protected procedures
    },
  })
})
