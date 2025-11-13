import { router, protectedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { subscriptionService } from '@/server/services/subscription.service'

/**
 * Subscription Router
 *
 * Handles subscription management, trial tracking, and payment operations
 */
export const subscriptionRouter = router({
  /**
   * Get current user's subscription
   * Returns subscription details including trial/paid status
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User ID not found')
    }

    return await subscriptionService.getSubscription(ctx.user.id)
  }),

  /**
   * Check subscription status and access
   * Returns whether user has active access (trial or paid)
   */
  checkStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User ID not found')
    }

    return await subscriptionService.checkSubscriptionStatus(ctx.user.id)
  }),

  /**
   * Create trial subscription
   * Typically called during signup process
   * Returns created subscription with 7-day trial
   */
  createTrial: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User ID not found')
    }

    return await subscriptionService.createTrialSubscription(ctx.user.id)
  }),

  /**
   * Activate paid subscription
   * Called after successful Stripe payment (typically by webhook)
   */
  activatePaidSubscription: protectedProcedure
    .input(
      z.object({
        stripeCustomerId: z.string(),
        stripeSubscriptionId: z.string(),
        planType: z.enum(['monthly', 'yearly']),
        planPriceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User ID not found')
      }

      return await subscriptionService.activatePaidSubscription(ctx.user.id, input)
    }),

  /**
   * Cancel subscription
   * User keeps access until end of current billing period
   */
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new Error('User ID not found')
    }

    return await subscriptionService.cancelSubscription(ctx.user.id)
  }),

  /**
   * Renew subscription
   * Extends subscription end date after payment
   */
  renew: protectedProcedure
    .input(
      z.object({
        planType: z.enum(['monthly', 'yearly']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User ID not found')
      }

      return await subscriptionService.renewSubscription(ctx.user.id, input.planType)
    }),
})
