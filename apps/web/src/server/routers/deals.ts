import { router, subscribedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { dealsService } from '@/server/services/deals.service'
import {
  createDealSchema,
  updateDealSchema,
  dealsFilterSchema,
} from '@/lib/validations'

/**
 * Deals Router
 * Protected by subscribedProcedure - requires active subscription
 */
export const dealsRouter = router({
  /**
   * List deals with optional filtering
   */
  list: subscribedProcedure
    .input(dealsFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      return await dealsService.list(ctx.user.id, input)
    }),

  /**
   * Get a single deal by ID
   */
  getById: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await dealsService.getById(ctx.user.id, input.id)
    }),

  /**
   * Create a new deal
   */
  create: subscribedProcedure
    .input(createDealSchema)
    .mutation(async ({ ctx, input }) => {
      return await dealsService.create(ctx.user.id, input)
    }),

  /**
   * Update a deal
   */
  update: subscribedProcedure
    .input(updateDealSchema)
    .mutation(async ({ ctx, input }) => {
      return await dealsService.update(ctx.user.id, input)
    }),

  /**
   * Delete a deal
   */
  delete: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await dealsService.delete(ctx.user.id, input.id)
      return { success: true }
    }),
})
