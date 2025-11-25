import { createClient } from '@/lib/supabase/server'
import type {
  Deal,
  DealWithRelations,
  CreateDealInput,
  UpdateDealInput,
  DealsFilterParams,
} from '@/types/crm'

/**
 * Deals Repository
 * Handles all database operations for deals including many-to-many relations
 */
export class DealsRepository {
  /**
   * List deals with optional filtering and relations
   */
  async list(userId: string, params?: DealsFilterParams, includeRelations = false): Promise<Deal[]> {
    const supabase = await createClient()

    let query = supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)

    // Filter by contact (using junction table)
    if (params?.contactId) {
      const { data: dealIds } = await supabase
        .from('deal_contacts')
        .select('deal_id')
        .eq('contact_id', params.contactId)

      if (dealIds && dealIds.length > 0) {
        query = query.in('id', dealIds.map(d => d.deal_id))
      } else {
        // No deals for this contact
        return []
      }
    }

    // Filter by property (using junction table)
    if (params?.propertyId) {
      const { data: dealIds } = await supabase
        .from('deal_properties')
        .select('deal_id')
        .eq('property_id', params.propertyId)

      if (dealIds && dealIds.length > 0) {
        query = query.in('id', dealIds.map(d => d.deal_id))
      } else {
        // No deals for this property
        return []
      }
    }

    if (params?.dealType) {
      query = query.eq('deal_type', params.dealType)
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

    const deals = (data || []).map(this.mapToDeal)

    // Optionally load relations
    if (includeRelations && deals.length > 0) {
      return await this.loadRelations(deals)
    }

    return deals
  }

  /**
   * Get a single deal by ID with optional relations
   */
  async findById(userId: string, dealId: string, includeRelations = false): Promise<Deal | null> {
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

    const deal = this.mapToDeal(data)

    if (includeRelations) {
      const [dealsWithRelations] = await this.loadRelations([deal])
      return dealsWithRelations
    }

    return deal
  }

  /**
   * Create a new deal with related contacts and properties
   */
  async create(userId: string, input: CreateDealInput): Promise<Deal> {
    const supabase = await createClient()

    // 1. Create the deal
    const { data, error } = await supabase
      .from('deals')
      .insert({
        user_id: userId,
        title: input.title,
        deal_type: input.dealType,
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

    const deal = this.mapToDeal(data)

    // 2. Link contacts (at least one required)
    if (input.contactIds && input.contactIds.length > 0) {
      const contactLinks = input.contactIds.map((contactId, index) => ({
        deal_id: deal.id,
        contact_id: contactId,
        role: index === 0 ? 'primary' : null,
      }))

      const { error: contactError } = await supabase
        .from('deal_contacts')
        .insert(contactLinks)

      if (contactError) {
        console.error('[DealsRepository] Error linking contacts:', contactError)
        // Rollback: delete the deal
        await supabase.from('deals').delete().eq('id', deal.id)
        throw new Error(`Failed to link contacts: ${contactError.message}`)
      }
    }

    // 3. Link properties (optional)
    if (input.propertyIds && input.propertyIds.length > 0) {
      const propertyLinks = input.propertyIds.map((propertyId, index) => ({
        deal_id: deal.id,
        property_id: propertyId,
        role: index === 0 ? 'primary' : null,
      }))

      const { error: propertyError } = await supabase
        .from('deal_properties')
        .insert(propertyLinks)

      if (propertyError) {
        console.error('[DealsRepository] Error linking properties:', propertyError)
        // Non-fatal, deal still created
      }
    }

    return deal
  }

  /**
   * Update a deal
   */
  async update(userId: string, input: UpdateDealInput): Promise<Deal> {
    const supabase = await createClient()

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.dealType !== undefined) updateData.deal_type = input.dealType
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
   * Delete a deal (cascade deletes relations via FK)
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
   * Get related contact IDs for a deal
   */
  async getRelatedContactIds(dealId: string): Promise<string[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('deal_contacts')
      .select('contact_id')
      .eq('deal_id', dealId)

    if (error) {
      console.error('[DealsRepository] Error getting related contacts:', error)
      return []
    }

    return (data || []).map(d => d.contact_id)
  }

  /**
   * Get related property IDs for a deal
   */
  async getRelatedPropertyIds(dealId: string): Promise<string[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('deal_properties')
      .select('property_id')
      .eq('deal_id', dealId)

    if (error) {
      console.error('[DealsRepository] Error getting related properties:', error)
      return []
    }

    return (data || []).map(d => d.property_id)
  }

  /**
   * Add a contact to a deal
   */
  async addContact(dealId: string, contactId: string, role?: string): Promise<void> {
    const supabase = await createClient()

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('deal_contacts')
      .select('*')
      .eq('deal_id', dealId)
      .eq('contact_id', contactId)
      .single()

    // If already exists, just update the role if provided
    if (existing) {
      if (role !== undefined) {
        const { error } = await supabase
          .from('deal_contacts')
          .update({ role: role || null })
          .eq('deal_id', dealId)
          .eq('contact_id', contactId)

        if (error) {
          console.error('[DealsRepository] Error updating contact role:', error)
          throw new Error(`Failed to update contact role: ${error.message}`)
        }
      }
      return // Already linked, nothing more to do
    }

    // Insert new relationship
    const { error } = await supabase
      .from('deal_contacts')
      .insert({
        deal_id: dealId,
        contact_id: contactId,
        role: role || null,
      })

    if (error) {
      console.error('[DealsRepository] Error adding contact:', error)
      throw new Error(`Failed to add contact: ${error.message}`)
    }
  }

  /**
   * Remove a contact from a deal
   */
  async removeContact(dealId: string, contactId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('deal_contacts')
      .delete()
      .eq('deal_id', dealId)
      .eq('contact_id', contactId)

    if (error) {
      console.error('[DealsRepository] Error removing contact:', error)
      throw new Error(`Failed to remove contact: ${error.message}`)
    }
  }

  /**
   * Add a property to a deal
   */
  async addProperty(dealId: string, propertyId: string, role?: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('deal_properties')
      .insert({
        deal_id: dealId,
        property_id: propertyId,
        role: role || null,
      })

    if (error) {
      console.error('[DealsRepository] Error adding property:', error)
      throw new Error(`Failed to add property: ${error.message}`)
    }
  }

  /**
   * Remove a property from a deal
   */
  async removeProperty(dealId: string, propertyId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('deal_properties')
      .delete()
      .eq('deal_id', dealId)
      .eq('property_id', propertyId)

    if (error) {
      console.error('[DealsRepository] Error removing property:', error)
      throw new Error(`Failed to remove property: ${error.message}`)
    }
  }

  /**
   * Update all relations for a deal (replaces existing)
   */
  async updateRelations(dealId: string, contactIds?: string[], propertyIds?: string[]): Promise<void> {
    const supabase = await createClient()

    // Update contacts if provided
    if (contactIds !== undefined) {
      // Delete existing
      await supabase
        .from('deal_contacts')
        .delete()
        .eq('deal_id', dealId)

      // Insert new
      if (contactIds.length > 0) {
        const contactLinks = contactIds.map((contactId, index) => ({
          deal_id: dealId,
          contact_id: contactId,
          role: index === 0 ? 'primary' : null,
        }))

        await supabase
          .from('deal_contacts')
          .insert(contactLinks)
      }
    }

    // Update properties if provided
    if (propertyIds !== undefined) {
      // Delete existing
      await supabase
        .from('deal_properties')
        .delete()
        .eq('deal_id', dealId)

      // Insert new
      if (propertyIds.length > 0) {
        const propertyLinks = propertyIds.map((propertyId, index) => ({
          deal_id: dealId,
          property_id: propertyId,
          role: index === 0 ? 'primary' : null,
        }))

        await supabase
          .from('deal_properties')
          .insert(propertyLinks)
      }
    }
  }

  /**
   * Load related contacts and properties for deals
   */
  private async loadRelations(deals: Deal[]): Promise<DealWithRelations[]> {
    if (deals.length === 0) return []

    const supabase = await createClient()
    const dealIds = deals.map(d => d.id)

    // Load contact relations
    const { data: contactLinks } = await supabase
      .from('deal_contacts')
      .select('deal_id, contact_id')
      .in('deal_id', dealIds)

    // Load property relations
    const { data: propertyLinks } = await supabase
      .from('deal_properties')
      .select('deal_id, property_id')
      .in('deal_id', dealIds)

    // Map relations to deals
    return deals.map(deal => ({
      ...deal,
      contactIds: (contactLinks || [])
        .filter(link => link.deal_id === deal.id)
        .map(link => link.contact_id),
      propertyIds: (propertyLinks || [])
        .filter(link => link.deal_id === deal.id)
        .map(link => link.property_id),
    }))
  }

  /**
   * Map database row to Deal type
   */
  private mapToDeal(row: any): Deal {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      dealType: row.deal_type,
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
