import { createClient } from '@/lib/supabase/server'
import type {
  Contact,
  ContactWithRelations,
  CreateContactInput,
  UpdateContactInput,
  ContactsFilterParams,
  ContactProperty,
  PropertyRole,
} from '@/types/crm'

/**
 * Contacts Repository
 * Handles all database operations for contacts
 */
export class ContactsRepository {
  /**
   * Get all contacts for a user with optional filtering
   */
  async list(
    userId: string,
    filters?: ContactsFilterParams
  ): Promise<{ contacts: ContactWithRelations[]; total: number }> {
    const supabase = await createClient()

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Apply filters
    if (filters?.search) {
      // Split search into words and search across fields
      // This allows "Juan Juanito Juan" to match first_name=Juan and last_name=Juanito Juan
      const searchTerms = filters.search.trim().split(/\s+/)

      if (searchTerms.length === 1) {
        // Single term: search in any field
        const term = searchTerms[0]
        query = query.or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company.ilike.%${term}%`
        )
      } else {
        // Multiple terms: search where first term matches first_name OR any term matches last_name/email/phone/company
        const firstTerm = searchTerms[0]
        const otherTerms = searchTerms.slice(1).join(' ')

        query = query.or(
          `first_name.ilike.%${firstTerm}%,last_name.ilike.%${otherTerms}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
        )
      }
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category)
    }

    if (filters?.source && filters.source.length > 0) {
      query = query.in('source', filters.source)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    if (filters?.budgetMin) {
      query = query.gte('budget_max', filters.budgetMin)
    }

    if (filters?.budgetMax) {
      query = query.lte('budget_min', filters.budgetMax)
    }

    if (filters?.hasEmail) {
      query = query.not('email', 'is', null)
    }

    if (filters?.hasPhone) {
      query = query.not('phone', 'is', null)
    }

    if (filters?.createdAfter) {
      query = query.gte('created_at', filters.createdAfter.toISOString())
    }

    if (filters?.createdBefore) {
      query = query.lte('created_at', filters.createdBefore.toISOString())
    }

    // Sorting
    const sortBy = filters?.sortBy || 'createdAt'
    const sortOrder = filters?.sortOrder || 'desc'
    const columnMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      lastActivity: 'updated_at', // TODO: Use actual last activity when we add activities
    }
    query = query.order(columnMap[sortBy], { ascending: sortOrder === 'asc' })

    // Pagination
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[ContactsRepository] Error listing contacts:', error)
      throw new Error(`Failed to list contacts: ${error.message}`)
    }

    return {
      contacts: (data || []).map(this.mapToContact),
      total: count || 0,
    }
  }

  /**
   * Get a single contact by ID
   */
  async findById(userId: string, contactId: string): Promise<Contact | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      console.error('[ContactsRepository] Error finding contact:', error)
      throw new Error(`Failed to find contact: ${error.message}`)
    }

    return this.mapToContact(data)
  }

  /**
   * Find contact by email
   */
  async findByEmail(userId: string, email: string): Promise<Contact | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[ContactsRepository] Error finding contact by email:', error)
      throw new Error(`Failed to find contact by email: ${error.message}`)
    }

    return this.mapToContact(data)
  }

  /**
   * Create a new contact
   */
  async create(userId: string, input: CreateContactInput): Promise<Contact> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        profile_picture_url: input.profilePictureUrl || null,
        company: input.company || null,
        job_title: input.jobTitle || null,
        address_street: input.addressStreet || null,
        address_city: input.addressCity || null,
        address_state: input.addressState || null,
        address_zip: input.addressZip || null,
        address_country: input.addressCountry || 'US',
        status: input.status || 'lead',
        category: input.category || null,
        source: input.source || null,
        tags: input.tags || [],
        budget_min: input.budgetMin || null,
        budget_max: input.budgetMax || null,
        notes: input.notes || null,
        custom_fields: input.customFields || {},
      })
      .select()
      .single()

    if (error) {
      console.error('[ContactsRepository] Error creating contact:', error)
      throw new Error(`Failed to create contact: ${error.message}`)
    }

    return this.mapToContact(data)
  }

  /**
   * Update a contact
   */
  async update(userId: string, input: UpdateContactInput): Promise<Contact> {
    const supabase = await createClient()

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (input.firstName !== undefined) updateData.first_name = input.firstName
    if (input.lastName !== undefined) updateData.last_name = input.lastName
    if (input.email !== undefined) updateData.email = input.email || null
    if (input.phone !== undefined) updateData.phone = input.phone || null
    if (input.profilePictureUrl !== undefined)
      updateData.profile_picture_url = input.profilePictureUrl || null
    if (input.company !== undefined) updateData.company = input.company || null
    if (input.jobTitle !== undefined) updateData.job_title = input.jobTitle || null
    if (input.addressStreet !== undefined)
      updateData.address_street = input.addressStreet || null
    if (input.addressCity !== undefined)
      updateData.address_city = input.addressCity || null
    if (input.addressState !== undefined)
      updateData.address_state = input.addressState || null
    if (input.addressZip !== undefined)
      updateData.address_zip = input.addressZip || null
    if (input.addressCountry !== undefined)
      updateData.address_country = input.addressCountry || null
    if (input.status !== undefined) updateData.status = input.status
    if (input.category !== undefined) updateData.category = input.category || null
    if (input.source !== undefined) updateData.source = input.source || null
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.budgetMin !== undefined)
      updateData.budget_min = input.budgetMin || null
    if (input.budgetMax !== undefined)
      updateData.budget_max = input.budgetMax || null
    if (input.notes !== undefined) updateData.notes = input.notes || null
    if (input.customFields !== undefined) updateData.custom_fields = input.customFields

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[ContactsRepository] Error updating contact:', error)
      throw new Error(`Failed to update contact: ${error.message}`)
    }

    return this.mapToContact(data)
  }

  /**
   * Delete a contact
   */
  async delete(userId: string, contactId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId)

    if (error) {
      console.error('[ContactsRepository] Error deleting contact:', error)
      throw new Error(`Failed to delete contact: ${error.message}`)
    }
  }

  /**
   * Get contact-property relationships for a contact
   */
  async getContactProperties(contactId: string): Promise<ContactProperty[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_properties')
      .select('*')
      .eq('contact_id', contactId)

    if (error) {
      console.error('[ContactsRepository] Error getting contact properties:', error)
      throw new Error(`Failed to get contact properties: ${error.message}`)
    }

    return (data || []).map(row => ({
      id: row.id,
      contactId: row.contact_id,
      propertyId: row.property_id,
      role: row.role as PropertyRole,
      createdAt: new Date(row.created_at),
    }))
  }

  /**
   * Add a contact-property relationship
   */
  async addContactProperty(
    contactId: string,
    propertyId: string,
    role: PropertyRole
  ): Promise<ContactProperty> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_properties')
      .insert({
        contact_id: contactId,
        property_id: propertyId,
        role,
      })
      .select()
      .single()

    if (error) {
      console.error('[ContactsRepository] Error adding contact property:', error)
      throw new Error(`Failed to add contact property: ${error.message}`)
    }

    return {
      id: data.id,
      contactId: data.contact_id,
      propertyId: data.property_id,
      role: data.role as PropertyRole,
      createdAt: new Date(data.created_at),
    }
  }

  /**
   * Remove a contact-property relationship
   */
  async removeContactProperty(
    contactId: string,
    propertyId: string,
    role: PropertyRole
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_properties')
      .delete()
      .eq('contact_id', contactId)
      .eq('property_id', propertyId)
      .eq('role', role)

    if (error) {
      console.error('[ContactsRepository] Error removing contact property:', error)
      throw new Error(`Failed to remove contact property: ${error.message}`)
    }
  }

  /**
   * Map database row to Contact type
   */
  private mapToContact(row: any): Contact {
    return {
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      profilePictureUrl: row.profile_picture_url,
      company: row.company,
      jobTitle: row.job_title,
      addressStreet: row.address_street,
      addressCity: row.address_city,
      addressState: row.address_state,
      addressZip: row.address_zip,
      addressCountry: row.address_country,
      status: row.status,
      category: row.category,
      source: row.source,
      tags: row.tags || [],
      budgetMin: row.budget_min,
      budgetMax: row.budget_max,
      notes: row.notes,
      customFields: row.custom_fields || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}

export const contactsRepository = new ContactsRepository()
