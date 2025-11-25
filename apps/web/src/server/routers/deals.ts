import { router, subscribedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { dealsService } from '@/server/services/deals.service'
import {
  createDealSchema,
  updateDealSchema,
  dealsFilterSchema,
  addDealContactSchema,
  removeDealContactSchema,
  addDealPropertySchema,
  removeDealPropertySchema,
  updateDealRelationsSchema,
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
      return await dealsService.list(ctx.user.id, input, true)
    }),

  /**
   * Get a single deal by ID (with relations)
   */
  getById: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await dealsService.getById(ctx.user.id, input.id, true)
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

  /**
   * Get compliance score for a deal
   */
  getCompliance: subscribedProcedure
    .input(z.object({ dealId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await dealsService.getCompliance(ctx.user.id, input.dealId)
    }),

  /**
   * Get related contact IDs for a deal
   */
  getRelatedContactIds: subscribedProcedure
    .input(z.object({ dealId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await dealsService.getRelatedContactIds(ctx.user.id, input.dealId)
    }),

  /**
   * Get related property IDs for a deal
   */
  getRelatedPropertyIds: subscribedProcedure
    .input(z.object({ dealId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await dealsService.getRelatedPropertyIds(ctx.user.id, input.dealId)
    }),

  /**
   * Add a contact to a deal
   */
  addContact: subscribedProcedure
    .input(addDealContactSchema)
    .mutation(async ({ ctx, input }) => {
      await dealsService.addContact(ctx.user.id, input.dealId, input.contactId, input.role)
      return { success: true }
    }),

  /**
   * Remove a contact from a deal
   */
  removeContact: subscribedProcedure
    .input(removeDealContactSchema)
    .mutation(async ({ ctx, input }) => {
      await dealsService.removeContact(ctx.user.id, input.dealId, input.contactId)
      return { success: true }
    }),

  /**
   * Add a property to a deal
   */
  addProperty: subscribedProcedure
    .input(addDealPropertySchema)
    .mutation(async ({ ctx, input }) => {
      await dealsService.addProperty(ctx.user.id, input.dealId, input.propertyId, input.role)
      return { success: true }
    }),

  /**
   * Remove a property from a deal
   */
  removeProperty: subscribedProcedure
    .input(removeDealPropertySchema)
    .mutation(async ({ ctx, input }) => {
      await dealsService.removeProperty(ctx.user.id, input.dealId, input.propertyId)
      return { success: true }
    }),

  /**
   * Update all relations for a deal (replaces existing)
   */
  updateRelations: subscribedProcedure
    .input(updateDealRelationsSchema)
    .mutation(async ({ ctx, input }) => {
      await dealsService.updateRelations(ctx.user.id, input.dealId, input.contactIds, input.propertyIds)
      return { success: true }
    }),
})
