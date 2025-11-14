import { initTRPC, TRPCError } from '@trpc/server'
import { type Context } from './context'
import { hasActiveAccess } from '@/types/subscription'

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
 *
 * Note: Does NOT check subscription status. Use subscribedProcedure for that.
 * This allows users to access auth, payment, and subscription endpoints even without active subscription.
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

/**
 * Subscribed procedure - requires authentication AND active subscription
 * Throws UNAUTHORIZED error if user is not authenticated
 * Throws FORBIDDEN error if user does not have active subscription
 *
 * Use this for all feature endpoints (CRM, properties, messaging, etc.)
 * Do NOT use this for payment/subscription management endpoints
 */
export const subscribedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check subscription status from database
  const { data: subscription, error } = await ctx.supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', ctx.user.id)
    .single()

  if (error || !subscription) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No subscription found. Please subscribe to access this feature.',
    })
  }

  // Check if subscription is active
  const sub = {
    status: subscription.status,
    trialEndsAt: new Date(subscription.trial_ends_at),
    subscriptionEndDate: subscription.subscription_end_date
      ? new Date(subscription.subscription_end_date)
      : undefined,
  }

  if (!hasActiveAccess(sub as any)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Your subscription has expired. Please renew to access this feature.',
    })
  }

  return next({
    ctx: {
      ...ctx,
      subscription, // Add subscription to context for use in procedures
    },
  })
})
