import { router, subscribedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { propertiesService } from '@/server/services/properties.service'
import {
  createPropertySchema,
  updatePropertySchema,
  propertiesFilterSchema,
  propertyRoleSchema,
} from '@/lib/validations'

/**
 * Properties Router
 * Protected by subscribedProcedure - requires active subscription
 */
export const propertiesRouter = router({
  /**
   * List properties with filtering and pagination
   */
  list: subscribedProcedure
    .input(propertiesFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      return await propertiesService.list(ctx.user.id, input)
    }),

  /**
   * Get a single property by ID
   */
  getById: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await propertiesService.getById(ctx.user.id, input.id)
    }),

  /**
   * Get multiple properties by IDs (efficient batch fetch)
   */
  getByIds: subscribedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).max(100) }))
    .query(async ({ ctx, input }) => {
      return await propertiesService.getByIds(ctx.user.id, input.ids)
    }),

  /**
   * Create a new property
   */
  create: subscribedProcedure
    .input(createPropertySchema)
    .mutation(async ({ ctx, input }) => {
      return await propertiesService.create(ctx.user.id, input)
    }),

  /**
   * Update a property
   */
  update: subscribedProcedure
    .input(updatePropertySchema)
    .mutation(async ({ ctx, input }) => {
      return await propertiesService.update(ctx.user.id, input)
    }),

  /**
   * Delete a property
   */
  delete: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await propertiesService.delete(ctx.user.id, input.id)
      return { success: true }
    }),

  /**
   * Get contacts associated with a property
   */
  getContacts: subscribedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await propertiesService.getPropertyContacts(ctx.user.id, input.propertyId)
    }),

  /**
   * Link a property to a contact with a role
   */
  linkToContact: subscribedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        contactId: z.string().uuid(),
        role: propertyRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await propertiesService.linkToContact(
        ctx.user.id,
        input.propertyId,
        input.contactId,
        input.role
      )
    }),

  /**
   * Unlink a property from a contact
   */
  unlinkFromContact: subscribedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        contactId: z.string().uuid(),
        role: propertyRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await propertiesService.unlinkFromContact(
        ctx.user.id,
        input.propertyId,
        input.contactId,
        input.role
      )
      return { success: true }
    }),

  /**
   * Search properties (quick search)
   */
  search: subscribedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(50).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await propertiesService.search(ctx.user.id, input.query, input.limit)
    }),
})
