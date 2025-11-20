import { createClient } from '@/lib/supabase/server'
import type {
  Deal,
  CreateDealInput,
  UpdateDealInput,
  DealsFilterParams,
} from '@/types/crm'

/**
 * Deals Repository
 * Handles all database operations for deals
 */
export class DealsRepository {
  /**
   * List deals with optional filtering
   */
  async list(userId: string, params?: DealsFilterParams): Promise<Deal[]> {
    const supabase = await createClient()

    let query = supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)

    // Filters
    if (params?.contactId) {
      query = query.eq('contact_id', params.contactId)
    }
    if (params?.propertyId) {
      query = query.eq('property_id', params.propertyId)
    }
    if (params?.stage) {
      query = query.eq('stage', params.stage)
    }

    // Search by title
    if (params?.search && params.search.trim()) {
      query = query.ilike('title', `%${params.search}%`)
    }

    // Pagination
    const limit = params?.limit || 50
    const offset = params?.offset || 0

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('[DealsRepository] Error listing deals:', error)
      throw new Error(`Failed to list deals: ${error.message}`)
    }

    return (data || []).map(this.mapToDeal)
  }

  /**
   * Get a single deal by ID
   */
  async findById(userId: string, dealId: string): Promise<Deal | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[DealsRepository] Error finding deal:', error)
      throw new Error(`Failed to find deal: ${error.message}`)
    }

    return this.mapToDeal(data)
  }

  /**
   * Create a new deal
   */
  async create(userId: string, input: CreateDealInput): Promise<Deal> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('deals')
      .insert({
        user_id: userId,
        contact_id: input.contactId,
        property_id: input.propertyId || null,
        title: input.title,
        value: input.value || null,
        stage: input.stage || 'lead',
        probability: input.probability || null,
        expected_close_date: input.expectedCloseDate?.toISOString().split('T')[0] || null,
        notes: input.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[DealsRepository] Error creating deal:', error)
      throw new Error(`Failed to create deal: ${error.message}`)
    }

    return this.mapToDeal(data)
  }

  /**
   * Update a deal
   */
  async update(userId: string, input: UpdateDealInput): Promise<Deal> {
    const supabase = await createClient()

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.value !== undefined) updateData.value = input.value || null
    if (input.stage !== undefined) updateData.stage = input.stage
    if (input.probability !== undefined) updateData.probability = input.probability || null
    if (input.expectedCloseDate !== undefined) {
      updateData.expected_close_date = input.expectedCloseDate?.toISOString().split('T')[0] || null
    }
    if (input.actualCloseDate !== undefined) {
      updateData.actual_close_date = input.actualCloseDate?.toISOString().split('T')[0] || null
    }
    if (input.notes !== undefined) updateData.notes = input.notes || null

    const { data, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[DealsRepository] Error updating deal:', error)
      throw new Error(`Failed to update deal: ${error.message}`)
    }

    return this.mapToDeal(data)
  }

  /**
   * Delete a deal
   */
  async delete(userId: string, dealId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId)
      .eq('user_id', userId)

    if (error) {
      console.error('[DealsRepository] Error deleting deal:', error)
      throw new Error(`Failed to delete deal: ${error.message}`)
    }
  }

  /**
   * Map database row to Deal type
   */
  private mapToDeal(row: any): Deal {
    return {
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      propertyId: row.property_id,
      title: row.title,
      value: row.value,
      stage: row.stage,
      probability: row.probability,
      expectedCloseDate: row.expected_close_date ? new Date(row.expected_close_date) : undefined,
      actualCloseDate: row.actual_close_date ? new Date(row.actual_close_date) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}

export const dealsRepository = new DealsRepository()
