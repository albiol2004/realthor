import { router } from '@/lib/trpc/server'
import { subscribedProcedure } from '@/lib/trpc/server'
import { semanticSearchService } from '@/server/services/semantic-search.service'
import { z } from 'zod'

/**
 * Search Router
 * Handles semantic search across documents
 */
export const searchRouter = router({
  /**
   * Semantic search across documents
   * Uses vector embeddings for intelligent search
   */
  semanticSearch: subscribedProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Search query is required'),
        threshold: z.number().min(0).max(1).optional().default(0.6),
        limit: z.number().min(1).max(100).optional().default(20),
        entityType: z.enum(['contact', 'property', 'deal']).optional(),
        category: z
          .enum([
            'contract',
            'id',
            'inspection_report',
            'photo',
            'floor_plan',
            'title_deed',
            'other',
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User not authenticated')
      }

      return await semanticSearchService.searchDocuments(ctx.user.id, input)
    }),

  /**
   * Semantic search with full document details
   */
  semanticSearchWithDetails: subscribedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        threshold: z.number().min(0).max(1).optional().default(0.6),
        limit: z.number().min(1).max(100).optional().default(20),
        entityType: z.enum(['contact', 'property', 'deal']).optional(),
        category: z
          .enum([
            'contract',
            'id',
            'inspection_report',
            'photo',
            'floor_plan',
            'title_deed',
            'other',
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User not authenticated')
      }

      return await semanticSearchService.searchDocumentsWithDetails(ctx.user.id, input)
    }),

  /**
   * Find similar documents
   * Useful for "documents like this" recommendations
   */
  findSimilar: subscribedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error('User not authenticated')
      }

      return await semanticSearchService.findSimilarDocuments(
        ctx.user.id,
        input.documentId,
        input.limit
      )
    }),
})
