import { dealsRepository } from '@/server/repositories/deals.repository'
import type {
  Deal,
  CreateDealInput,
  UpdateDealInput,
  DealsFilterParams,
} from '@/types/crm'
import { TRPCError } from '@trpc/server'

/**
 * Deals Service
 * Business logic for deal management
 */
export class DealsService {
  /**
   * List deals with optional filtering
   */
  async list(userId: string, params?: DealsFilterParams): Promise<Deal[]> {
    return await dealsRepository.list(userId, params)
  }

  /**
   * Get a deal by ID
   */
  async getById(userId: string, dealId: string): Promise<Deal> {
    const deal = await dealsRepository.findById(userId, dealId)

    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    return deal
  }

  /**
   * Create a new deal
   */
  async create(userId: string, input: CreateDealInput): Promise<Deal> {
    // Validate required fields
    if (!input.title || input.title.trim().length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deal title is required',
      })
    }

    // Validate value if provided
    if (input.value !== undefined && input.value < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deal value cannot be negative',
      })
    }

    // Validate probability if provided
    if (input.probability !== undefined && (input.probability < 0 || input.probability > 100)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Probability must be between 0 and 100',
      })
    }

    return await dealsRepository.create(userId, input)
  }

  /**
   * Update a deal
   */
  async update(userId: string, input: UpdateDealInput): Promise<Deal> {
    // Check if deal exists
    const existing = await dealsRepository.findById(userId, input.id)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    // Validate title if provided
    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deal title cannot be empty',
      })
    }

    // Validate value if provided
    if (input.value !== undefined && input.value < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Deal value cannot be negative',
      })
    }

    // Validate probability if provided
    if (input.probability !== undefined && (input.probability < 0 || input.probability > 100)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Probability must be between 0 and 100',
      })
    }

    return await dealsRepository.update(userId, input)
  }

  /**
   * Delete a deal
   */
  async delete(userId: string, dealId: string): Promise<void> {
    // Check if deal exists
    const existing = await dealsRepository.findById(userId, dealId)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    await dealsRepository.delete(userId, dealId)
  }
}

export const dealsService = new DealsService()
