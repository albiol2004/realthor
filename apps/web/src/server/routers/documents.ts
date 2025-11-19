import { router, subscribedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { documentsService } from '@/server/services/documents.service'
import {
  createDocumentSchema,
  updateDocumentSchema,
  entityTypeSchema,
  documentSearchSchema,
} from '@/lib/validations'

/**
 * Documents Router
 * Protected by subscribedProcedure - requires active subscription
 */
export const documentsRouter = router({
  /**
   * List documents for a specific entity
   */
  listByEntity: subscribedProcedure
    .input(
      z.object({
        entityType: entityTypeSchema,
        entityId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await documentsService.listByEntity(
        ctx.user.id,
        input.entityType,
        input.entityId
      )
    }),

  /**
   * List all documents for user
   */
  listAll: subscribedProcedure.query(async ({ ctx }) => {
    return await documentsService.listAll(ctx.user.id)
  }),

  /**
   * Get a single document by ID
   */
  getById: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await documentsService.getById(ctx.user.id, input.id)
    }),

  /**
   * Create a new document
   */
  create: subscribedProcedure
    .input(createDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      return await documentsService.create(ctx.user.id, input)
    }),

  /**
   * Update a document
   */
  update: subscribedProcedure
    .input(updateDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      return await documentsService.update(ctx.user.id, input)
    }),

  /**
   * Delete a document
   */
  delete: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await documentsService.delete(ctx.user.id, input.id)
      return { success: true }
    }),

  /**
   * Smart filtered search with full-text search
   */
  search: subscribedProcedure
    .input(documentSearchSchema)
    .query(async ({ ctx, input }) => {
      return await documentsService.search(ctx.user.id, input)
    }),
})
