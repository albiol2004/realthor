/**
 * Payment tRPC Router
 * API endpoints for Stripe payment operations
 */

import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { paymentService } from '@/server/services/payment.service'

export const paymentRouter = router({
  /**
   * Create a checkout session for subscription payment
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await paymentService.createCheckoutSession({
        priceId: input.priceId,
        userId: ctx.user.id,
        userEmail: ctx.user.email!,
      })

      return session
    }),

  /**
   * Create a customer portal session for subscription management
   */
  createCustomerPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const portal = await paymentService.createCustomerPortal({
      userId: ctx.user.id,
    })

    return portal
  }),
})
