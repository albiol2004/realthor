import { dealsRepository } from '@/server/repositories/deals.repository'
import { documentsRepository } from '@/server/repositories/documents.repository'
import type {
  Deal,
  DealWithRelations,
  CreateDealInput,
  UpdateDealInput,
  DealsFilterParams,
} from '@/types/crm'
import { TRPCError } from '@trpc/server'
import { calculateDealCompliance, getRequiredDocuments } from '@/lib/config/deal-compliance'

/**
 * Deals Service
 * Business logic for deal management including relations
 */
export class DealsService {
  /**
   * List deals with optional filtering
   */
  async list(userId: string, params?: DealsFilterParams, includeRelations = false): Promise<Deal[]> {
    return await dealsRepository.list(userId, params, includeRelations)
  }

  /**
   * Get a deal by ID
   */
  async getById(userId: string, dealId: string, includeRelations = true): Promise<DealWithRelations> {
    const deal = await dealsRepository.findById(userId, dealId, includeRelations)

    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    return deal as DealWithRelations
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

    // Validate at least one contact
    if (!input.contactIds || input.contactIds.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'At least one contact is required',
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

  /**
   * Get compliance score for a deal
   * Calculates based on deal type and uploaded documents
   */
  async getCompliance(userId: string, dealId: string) {
    // Get the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    // Get documents linked to this deal
    const documents = await documentsRepository.listByEntity(userId, 'deal', dealId)

    // Calculate compliance score
    const compliance = calculateDealCompliance(deal.dealType, documents)

    // Get required documents for this deal type
    const requirements = getRequiredDocuments(deal.dealType)

    return {
      dealId: deal.id,
      dealType: deal.dealType,
      dealTypeLabel: requirements.label,
      score: compliance.score,
      critical: compliance.critical,
      legallyRecommended: compliance.legallyRecommended,
      advised: compliance.advised,
      missingCritical: compliance.missingCritical,
      requirements,
    }
  }

  /**
   * Get related contact IDs for a deal
   */
  async getRelatedContactIds(userId: string, dealId: string): Promise<string[]> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    return await dealsRepository.getRelatedContactIds(dealId)
  }

  /**
   * Get related property IDs for a deal
   */
  async getRelatedPropertyIds(userId: string, dealId: string): Promise<string[]> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    return await dealsRepository.getRelatedPropertyIds(dealId)
  }

  /**
   * Add a contact to a deal
   */
  async addContact(userId: string, dealId: string, contactId: string, role?: string): Promise<void> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    await dealsRepository.addContact(dealId, contactId, role)
  }

  /**
   * Remove a contact from a deal
   */
  async removeContact(userId: string, dealId: string, contactId: string): Promise<void> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    // Check that we're not removing the last contact
    const contactIds = await dealsRepository.getRelatedContactIds(dealId)
    if (contactIds.length <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot remove the last contact from a deal',
      })
    }

    await dealsRepository.removeContact(dealId, contactId)
  }

  /**
   * Add a property to a deal
   */
  async addProperty(userId: string, dealId: string, propertyId: string, role?: string): Promise<void> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    await dealsRepository.addProperty(dealId, propertyId, role)
  }

  /**
   * Remove a property from a deal
   */
  async removeProperty(userId: string, dealId: string, propertyId: string): Promise<void> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    await dealsRepository.removeProperty(dealId, propertyId)
  }

  /**
   * Update all relations for a deal (replaces existing)
   */
  async updateRelations(
    userId: string,
    dealId: string,
    contactIds?: string[],
    propertyIds?: string[]
  ): Promise<void> {
    // Verify user owns the deal
    const deal = await dealsRepository.findById(userId, dealId)
    if (!deal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Deal not found',
      })
    }

    // Ensure at least one contact remains
    if (contactIds !== undefined && contactIds.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'At least one contact is required',
      })
    }

    await dealsRepository.updateRelations(dealId, contactIds, propertyIds)
  }
}

export const dealsService = new DealsService()
