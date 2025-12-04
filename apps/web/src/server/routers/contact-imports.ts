import { router, subscribedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { contactImportsRepository } from '@/server/repositories/contact-imports.repository'
import { TRPCError } from '@trpc/server'

/**
 * Contact Imports Router
 * Handles CSV contact import operations
 */
export const contactImportsRouter = router({
  /**
   * List all import jobs for the current user
   */
  list: subscribedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'analyzing', 'pending_review', 'processing', 'completed', 'failed'])
          .or(z.array(z.enum(['pending', 'analyzing', 'pending_review', 'processing', 'completed', 'failed'])))
          .optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return await contactImportsRepository.list(ctx.user.id, input?.status)
    }),

  /**
   * Get a single import job by ID
   */
  getById: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const job = await contactImportsRepository.findById(ctx.user.id, input.id)

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Import job not found',
        })
      }

      return job
    }),

  /**
   * Create a new import job
   * File should already be uploaded to Supabase Storage
   */
  create: subscribedProcedure
    .input(
      z.object({
        mode: z.enum(['safe', 'balanced', 'turbo']),
        fileName: z.string().min(1),
        fileUrl: z.string().url(),
        fileSizeBytes: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await contactImportsRepository.create(ctx.user.id, input)
    }),

  /**
   * Delete an import job
   */
  delete: subscribedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await contactImportsRepository.delete(ctx.user.id, input.id)
      return { success: true }
    }),

  /**
   * Get rows for an import job
   */
  getRows: subscribedProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        status: z.enum(['new', 'duplicate', 'conflict', 'imported', 'skipped'])
          .or(z.array(z.enum(['new', 'duplicate', 'conflict', 'imported', 'skipped'])))
          .optional(),
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().nonnegative().optional(),
        includeContacts: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify job belongs to user
      const job = await contactImportsRepository.findById(ctx.user.id, input.jobId)
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Import job not found',
        })
      }

      let rows = await contactImportsRepository.getRows(input.jobId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      })

      // Optionally hydrate with contact details
      if (input.includeContacts) {
        rows = await contactImportsRepository.hydrateRowsWithContacts(rows)
      }

      return rows
    }),

  /**
   * Get rows that need review (duplicates/conflicts without decision)
   */
  getRowsNeedingReview: subscribedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify job belongs to user
      const job = await contactImportsRepository.findById(ctx.user.id, input.jobId)
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Import job not found',
        })
      }

      const rows = await contactImportsRepository.getRowsNeedingReview(input.jobId)
      return await contactImportsRepository.hydrateRowsWithContacts(rows)
    }),

  /**
   * Update decision for a single row
   */
  updateRowDecision: subscribedProcedure
    .input(
      z.object({
        rowId: z.string().uuid(),
        decision: z.enum(['create', 'update', 'skip']),
        overwriteFields: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await contactImportsRepository.updateRowDecision(
        input.rowId,
        input.decision,
        input.overwriteFields
      )
      return { success: true }
    }),

  /**
   * Bulk update decisions for all rows with a specific status
   */
  bulkUpdateDecision: subscribedProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        status: z.enum(['new', 'duplicate', 'conflict']),
        decision: z.enum(['create', 'update', 'skip']),
        overwriteAll: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify job belongs to user
      const job = await contactImportsRepository.findById(ctx.user.id, input.jobId)
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Import job not found',
        })
      }

      const updatedCount = await contactImportsRepository.bulkUpdateDecision(
        input.jobId,
        input.status,
        input.decision,
        input.overwriteAll
      )

      return { success: true, updatedCount }
    }),

  /**
   * Execute the import (after review)
   */
  execute: subscribedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify job belongs to user and is in pending_review status
      const job = await contactImportsRepository.findById(ctx.user.id, input.jobId)

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Import job not found',
        })
      }

      if (job.status !== 'pending_review') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot execute import with status "${job.status}". Must be "pending_review".`,
        })
      }

      // Check if there are rows without decisions
      const pendingCount = await contactImportsRepository.countPendingReview(input.jobId)
      if (pendingCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `There are ${pendingCount} rows that still need a decision. Please review all duplicates and conflicts before executing.`,
        })
      }

      // Trigger execution
      await contactImportsRepository.triggerExecution(ctx.user.id, input.jobId)

      return { success: true, message: 'Import execution started' }
    }),

  /**
   * Get import statistics
   */
  getStats: subscribedProcedure.query(async ({ ctx }) => {
    const jobs = await contactImportsRepository.list(ctx.user.id)

    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      analyzing: jobs.filter(j => j.status === 'analyzing').length,
      pendingReview: jobs.filter(j => j.status === 'pending_review').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      totalCreated: jobs.reduce((sum, j) => sum + j.createdCount, 0),
      totalUpdated: jobs.reduce((sum, j) => sum + j.updatedCount, 0),
    }

    return stats
  }),
})
