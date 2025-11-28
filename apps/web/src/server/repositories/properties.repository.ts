import { createClient } from '@/lib/supabase/server'
import type {
  Property,
  PropertyWithRelations,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertiesFilterParams,
} from '@/types/crm'

/**
 * Properties Repository
 * Handles all database operations for properties
 */
export class PropertiesRepository {
  /**
   * Get all properties for a user with optional filtering
   */
  async list(
    userId: string,
    filters?: PropertiesFilterParams
  ): Promise<{ properties: PropertyWithRelations[]; total: number }> {
    const supabase = await createClient()

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Apply filters
    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
      )
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters?.propertyType && filters.propertyType.length > 0) {
      query = query.in('property_type', filters.propertyType)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    if (filters?.priceMin) {
      query = query.gte('price', filters.priceMin)
    }

    if (filters?.priceMax) {
      query = query.lte('price', filters.priceMax)
    }

    if (filters?.bedroomsMin) {
      query = query.gte('bedrooms', filters.bedroomsMin)
    }

    if (filters?.bedroomsMax) {
      query = query.lte('bedrooms', filters.bedroomsMax)
    }

    if (filters?.bathroomsMin) {
      query = query.gte('bathrooms', filters.bathroomsMin)
    }

    if (filters?.bathroomsMax) {
      query = query.lte('bathrooms', filters.bathroomsMax)
    }

    if (filters?.squareFeetMin) {
      query = query.gte('square_feet', filters.squareFeetMin)
    }

    if (filters?.squareFeetMax) {
      query = query.lte('square_feet', filters.squareFeetMax)
    }

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`)
    }

    if (filters?.state) {
      query = query.ilike('state', `%${filters.state}%`)
    }

    // Sorting
    const sortBy = filters?.sortBy || 'createdAt'
    const sortOrder = filters?.sortOrder || 'desc'
    const columnMap = {
      title: 'title',
      price: 'price',
      bedrooms: 'bedrooms',
      createdAt: 'created_at',
      listingDate: 'listing_date',
    }
    query = query.order(columnMap[sortBy], { ascending: sortOrder === 'asc' })

    // Pagination
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[PropertiesRepository] Error listing properties:', error)
      throw new Error(`Failed to list properties: ${error.message}`)
    }

    return {
      properties: (data || []).map(this.mapToProperty),
      total: count || 0,
    }
  }

  /**
   * Get a single property by ID
   */
  async findById(userId: string, propertyId: string): Promise<Property | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[PropertiesRepository] Error finding property:', error)
      throw new Error(`Failed to find property: ${error.message}`)
    }

    return this.mapToProperty(data)
  }

  /**
   * Get multiple properties by IDs (efficient batch fetch)
   */
  async findByIds(userId: string, propertyIds: string[]): Promise<Property[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds)
      .eq('user_id', userId)

    if (error) {
      console.error('[PropertiesRepository] Error finding properties by IDs:', error)
      throw new Error(`Failed to find properties: ${error.message}`)
    }

    return (data || []).map(this.mapToProperty)
  }

  /**
   * Create a new property
   */
  async create(userId: string, input: CreatePropertyInput): Promise<Property> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('properties')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description || null,
        address: input.address,
        city: input.city || null,
        state: input.state || null,
        zip_code: input.zipCode || null,
        country: input.country || 'US',
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        price: input.price || null,
        bedrooms: input.bedrooms || null,
        bathrooms: input.bathrooms || null,
        square_feet: input.squareFeet || null,
        lot_size: input.lotSize || null,
        year_built: input.yearBuilt || null,
        property_type: input.propertyType || 'residential',
        status: input.status || 'available',
        listing_date: input.listingDate || null,
        images: input.images || [],
        virtual_tour_url: input.virtualTourUrl || null,
        tags: input.tags || [],
        custom_fields: input.customFields || {},
      })
      .select()
      .single()

    if (error) {
      console.error('[PropertiesRepository] Error creating property:', error)
      throw new Error(`Failed to create property: ${error.message}`)
    }

    return this.mapToProperty(data)
  }

  /**
   * Update a property
   */
  async update(userId: string, input: UpdatePropertyInput): Promise<Property> {
    const supabase = await createClient()

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description || null
    if (input.address !== undefined) updateData.address = input.address
    if (input.city !== undefined) updateData.city = input.city || null
    if (input.state !== undefined) updateData.state = input.state || null
    if (input.zipCode !== undefined) updateData.zip_code = input.zipCode || null
    if (input.country !== undefined) updateData.country = input.country || null
    if (input.latitude !== undefined) updateData.latitude = input.latitude || null
    if (input.longitude !== undefined) updateData.longitude = input.longitude || null
    if (input.price !== undefined) updateData.price = input.price || null
    if (input.bedrooms !== undefined) updateData.bedrooms = input.bedrooms || null
    if (input.bathrooms !== undefined) updateData.bathrooms = input.bathrooms || null
    if (input.squareFeet !== undefined) updateData.square_feet = input.squareFeet || null
    if (input.lotSize !== undefined) updateData.lot_size = input.lotSize || null
    if (input.yearBuilt !== undefined) updateData.year_built = input.yearBuilt || null
    if (input.propertyType !== undefined) updateData.property_type = input.propertyType
    if (input.status !== undefined) updateData.status = input.status
    if (input.listingDate !== undefined) updateData.listing_date = input.listingDate || null
    if (input.images !== undefined) updateData.images = input.images
    if (input.virtualTourUrl !== undefined)
      updateData.virtual_tour_url = input.virtualTourUrl || null
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.customFields !== undefined) updateData.custom_fields = input.customFields

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[PropertiesRepository] Error updating property:', error)
      throw new Error(`Failed to update property: ${error.message}`)
    }

    return this.mapToProperty(data)
  }

  /**
   * Delete a property
   */
  async delete(userId: string, propertyId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)
      .eq('user_id', userId)

    if (error) {
      console.error('[PropertiesRepository] Error deleting property:', error)
      throw new Error(`Failed to delete property: ${error.message}`)
    }
  }

  /**
   * Search properties (simplified search)
   */
  async search(userId: string, query: string, limit: number = 10): Promise<Property[]> {
    const { properties } = await this.list(userId, {
      search: query,
      limit,
      sortBy: 'title',
      sortOrder: 'asc',
    })

    return properties
  }

  /**
   * Map database row to Property type
   */
  private mapToProperty(row: any): Property {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
      price: row.price,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      squareFeet: row.square_feet,
      lotSize: row.lot_size,
      yearBuilt: row.year_built,
      propertyType: row.property_type,
      status: row.status,
      listingDate: row.listing_date ? new Date(row.listing_date) : undefined,
      images: row.images || [],
      virtualTourUrl: row.virtual_tour_url,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}

export const propertiesRepository = new PropertiesRepository()
