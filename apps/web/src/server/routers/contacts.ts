import { router, subscribedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { contactsService } from '@/server/services/contacts.service'
import {
  createContactSchema,
  updateContactSchema,
  quickCreateContactSchema,
  contactsFilterSchema,
  propertyRoleSchema,
} from '@/lib/validations'

/**
 * Contacts Router
 * Protected by subscribedProcedure - requires active subscription
 */
export const contactsRouter = router({
  /**
   * List contacts with filtering and pagination
   */
  list: subscribedProcedure
    .input(contactsFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      return await contactsService.list(ctx.user.id, input)
    }),

  /**
   * Get a single contact by ID
   */
  getById: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await contactsService.getById(ctx.user.id, input.id)
    }),

  /**
   * Get multiple contacts by IDs (efficient batch fetch)
   */
  getByIds: subscribedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).max(100) }))
    .query(async ({ ctx, input }) => {
      return await contactsService.getByIds(ctx.user.id, input.ids)
    }),

  /**
   * Create a new contact (full form)
   */
  create: subscribedProcedure
    .input(createContactSchema)
    .mutation(async ({ ctx, input }) => {
      return await contactsService.create(ctx.user.id, input)
    }),

  /**
   * Quick create a contact (minimal fields)
   */
  quickCreate: subscribedProcedure
    .input(quickCreateContactSchema)
    .mutation(async ({ ctx, input }) => {
      return await contactsService.quickCreate(ctx.user.id, input)
    }),

  /**
   * Update a contact
   */
  update: subscribedProcedure
    .input(updateContactSchema)
    .mutation(async ({ ctx, input }) => {
      return await contactsService.update(ctx.user.id, input)
    }),

  /**
   * Delete a contact
   */
  delete: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await contactsService.delete(ctx.user.id, input.id)
      return { success: true }
    }),

  /**
   * Get properties associated with a contact
   */
  getProperties: subscribedProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await contactsService.getContactProperties(ctx.user.id, input.contactId)
    }),

  /**
   * Link a contact to a property with a role
   */
  linkToProperty: subscribedProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        propertyId: z.string().uuid(),
        role: propertyRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await contactsService.linkToProperty(
        ctx.user.id,
        input.contactId,
        input.propertyId,
        input.role
      )
    }),

  /**
   * Unlink a contact from a property
   */
  unlinkFromProperty: subscribedProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        propertyId: z.string().uuid(),
        role: propertyRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await contactsService.unlinkFromProperty(
        ctx.user.id,
        input.contactId,
        input.propertyId,
        input.role
      )
      return { success: true }
    }),

  /**
   * Search contacts (quick search)
   */
  search: subscribedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(50).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await contactsService.search(ctx.user.id, input.query, input.limit)
    }),
})
