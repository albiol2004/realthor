import { propertiesRepository } from '@/server/repositories/properties.repository'
import { contactsRepository } from '@/server/repositories/contacts.repository'
import type {
  Property,
  PropertyWithRelations,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertiesFilterParams,
  PropertyRole,
} from '@/types/crm'
import { TRPCError } from '@trpc/server'

/**
 * Properties Service
 * Business logic for property management
 */
export class PropertiesService {
  /**
   * List properties with filtering and pagination
   */
  async list(
    userId: string,
    filters?: PropertiesFilterParams
  ): Promise<{ properties: PropertyWithRelations[]; total: number }> {
    return await propertiesRepository.list(userId, filters)
  }

  /**
   * Get a property by ID
   */
  async getById(userId: string, propertyId: string): Promise<Property> {
    const property = await propertiesRepository.findById(userId, propertyId)

    if (!property) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Property not found',
      })
    }

    return property
  }

  /**
   * Create a new property
   */
  async create(userId: string, input: CreatePropertyInput): Promise<Property> {
    // Validate price range if both provided
    if (input.price && input.price < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Price cannot be negative',
      })
    }

    // Validate year built
    if (input.yearBuilt) {
      const currentYear = new Date().getFullYear()
      if (input.yearBuilt < 1800 || input.yearBuilt > currentYear + 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Year built must be between 1800 and ${currentYear + 1}`,
        })
      }
    }

    return await propertiesRepository.create(userId, input)
  }

  /**
   * Update a property
   */
  async update(userId: string, input: UpdatePropertyInput): Promise<Property> {
    // Check if property exists
    const existing = await propertiesRepository.findById(userId, input.id)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Property not found',
      })
    }

    // Validate price
    if (input.price !== undefined && input.price < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Price cannot be negative',
      })
    }

    // Validate year built
    if (input.yearBuilt) {
      const currentYear = new Date().getFullYear()
      if (input.yearBuilt < 1800 || input.yearBuilt > currentYear + 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Year built must be between 1800 and ${currentYear + 1}`,
        })
      }
    }

    return await propertiesRepository.update(userId, input)
  }

  /**
   * Delete a property
   */
  async delete(userId: string, propertyId: string): Promise<void> {
    // Check if property exists
    const existing = await propertiesRepository.findById(userId, propertyId)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Property not found',
      })
    }

    await propertiesRepository.delete(userId, propertyId)
  }

  /**
   * Search properties (simplified search)
   */
  async search(userId: string, query: string, limit: number = 10): Promise<Property[]> {
    const { properties } = await propertiesRepository.list(userId, {
      search: query,
      limit,
      sortBy: 'title',
      sortOrder: 'asc',
    })

    return properties
  }

  /**
   * Get contacts associated with a property
   */
  async getPropertyContacts(userId: string, propertyId: string) {
    // Verify property belongs to user
    const property = await this.getById(userId, propertyId)

    // Get all contact-property relationships for this property
    const supabase = await (await import('@/lib/supabase/server')).createClient()

    const { data, error } = await supabase
      .from('contact_properties')
      .select(`
        id,
        contact_id,
        role,
        created_at
      `)
      .eq('property_id', property.id)

    if (error) {
      console.error('[PropertiesService] Error getting property contacts:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get property contacts',
      })
    }

    // Fetch full contact details for each relationship
    const contactsWithRoles = await Promise.all(
      (data || []).map(async (rel) => {
        const contact = await contactsRepository.findById(userId, rel.contact_id)
        return {
          ...contact,
          role: rel.role as PropertyRole,
          relationshipId: rel.id,
          linkedAt: new Date(rel.created_at),
        }
      })
    )

    return contactsWithRoles.filter((c) => c !== null)
  }

  /**
   * Link a property to a contact with a role
   */
  async linkToContact(
    userId: string,
    propertyId: string,
    contactId: string,
    role: PropertyRole
  ) {
    // Verify property belongs to user
    await this.getById(userId, propertyId)

    // Verify contact belongs to user
    const contact = await contactsRepository.findById(userId, contactId)
    if (!contact) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contact not found',
      })
    }

    // Create the relationship using contacts repository
    try {
      return await contactsRepository.addContactProperty(contactId, propertyId, role)
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.message.includes('duplicate') || error.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This property-contact relationship already exists',
        })
      }
      throw error
    }
  }

  /**
   * Unlink a property from a contact
   */
  async unlinkFromContact(
    userId: string,
    propertyId: string,
    contactId: string,
    role: PropertyRole
  ) {
    // Verify property belongs to user
    await this.getById(userId, propertyId)

    await contactsRepository.removeContactProperty(contactId, propertyId, role)
  }
}

export const propertiesService = new PropertiesService()
