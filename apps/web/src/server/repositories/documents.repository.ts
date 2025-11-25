import { createClient } from '@/lib/supabase/server'
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  EntityType,
} from '@/types/crm'

/**
 * Documents Repository
 * Handles all database operations for documents
 */
export class DocumentsRepository {
  /**
   * Get all documents for a specific entity
   * Checks BOTH old pattern (entity_type/entity_id) AND new pattern (related_contact_ids/related_property_ids arrays)
   */
  async listByEntity(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<Document[]> {
    const supabase = await createClient()

    // Build query to check both patterns:
    // 1. Old pattern: entity_type = 'contact' AND entity_id = contactId
    // 2. New pattern: contactId IN related_contact_ids array
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)

    // Check based on entity type
    if (entityType === 'contact') {
      // Match documents where:
      // - Old pattern: entity_type = 'contact' AND entity_id = contactId
      // - New pattern: contactId is in related_contact_ids array
      query = query.or(`and(entity_type.eq.contact,entity_id.eq.${entityId}),related_contact_ids.cs.{${entityId}}`)
    } else if (entityType === 'property') {
      // Match documents where:
      // - Old pattern: entity_type = 'property' AND entity_id = propertyId
      // - New pattern: propertyId is in related_property_ids array
      query = query.or(`and(entity_type.eq.property,entity_id.eq.${entityId}),related_property_ids.cs.{${entityId}}`)
    } else if (entityType === 'deal') {
      // For deals, only use old pattern (no array relationship yet)
      query = query.eq('entity_type', entityType).eq('entity_id', entityId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[DocumentsRepository] Error listing documents:', error)
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    return this.attachContactsToDocuments(data || [])
  }

  /**
   * Get all documents for a user
   */
  async listAll(userId: string): Promise<Document[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DocumentsRepository] Error listing all documents:', error)
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    return this.attachContactsToDocuments(data || [])
  }

  /**
   * Get a single document by ID
   */
  async findById(userId: string, documentId: string): Promise<Document | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[DocumentsRepository] Error finding document:', error)
      throw new Error(`Failed to find document: ${error.message}`)
    }

    return this.mapToDocument(data)
  }

  /**
   * Create a new document
   */
  async create(userId: string, input: CreateDocumentInput): Promise<Document> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        filename: input.filename,
        display_name: input.displayName || input.filename, // Use custom name or fall back to filename
        file_url: input.fileUrl,
        file_size: input.fileSize || null,
        file_type: input.fileType || null,
        entity_type: input.entityType,
        entity_id: input.entityId,
        category: input.documentType || null, // documentType → category mapping
        document_date: input.documentDate?.toISOString().split('T')[0] || null,
        due_date: input.dueDate?.toISOString().split('T')[0] || null,
        tags: input.tags || [],
        description: input.description || null,
        related_contact_ids: input.relatedContactIds || [],
        related_property_ids: input.relatedPropertyIds || [],
        uploaded_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[DocumentsRepository] Error creating document:', error)
      throw new Error(`Failed to create document: ${error.message}`)
    }

    return this.mapToDocument(data)
  }

  /**
   * Update a document
   */
  async update(userId: string, input: UpdateDocumentInput): Promise<Document> {
    const supabase = await createClient()

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (input.filename !== undefined) updateData.filename = input.filename
    if (input.displayName !== undefined) updateData.display_name = input.displayName || input.filename // Allow updating display name
    if (input.fileUrl !== undefined) updateData.file_url = input.fileUrl
    if (input.fileSize !== undefined) updateData.file_size = input.fileSize || null
    if (input.fileType !== undefined) updateData.file_type = input.fileType || null
    if (input.documentType !== undefined) updateData.category = input.documentType || null // documentType → category
    if (input.documentDate !== undefined) updateData.document_date = input.documentDate?.toISOString().split('T')[0] || null
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate?.toISOString().split('T')[0] || null
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.description !== undefined) updateData.description = input.description || null
    if (input.relatedContactIds !== undefined) updateData.related_contact_ids = input.relatedContactIds
    if (input.relatedPropertyIds !== undefined) updateData.related_property_ids = input.relatedPropertyIds

    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[DocumentsRepository] Error updating document:', error)
      throw new Error(`Failed to update document: ${error.message}`)
    }

    return this.mapToDocument(data)
  }

  /**
   * Delete a document
   */
  async delete(userId: string, documentId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (error) {
      console.error('[DocumentsRepository] Error deleting document:', error)
      throw new Error(`Failed to delete document: ${error.message}`)
    }
  }

  /**
   * Smart filtered search with full-text search on OCR text
   */
  async search(userId: string, params: {
    query?: string
    entityType?: EntityType
    entityId?: string
    documentType?: string
    tags?: string[]
    ocrStatus?: string
    hasSignature?: boolean
    importanceScore?: number
    importanceScoreMin?: number
    dateFrom?: Date
    dateTo?: Date
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }): Promise<Document[]> {
    const supabase = await createClient()

    // If query is provided, do extended search including contacts/properties
    if (params.query && params.query.trim()) {
      const searchTerm = params.query.trim()

      // Search for matching contacts
      let contactQuery = supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)

      const searchTerms = searchTerm.split(/\s+/)

      if (searchTerms.length === 1) {
        contactQuery = contactQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      } else {
        // Handle multi-word search (e.g. "Juan Juanito")
        // Check if first word matches first_name OR remaining words match last_name
        // Also check if full string matches last_name or email
        const firstTerm = searchTerms[0]
        const otherTerms = searchTerms.slice(1).join(' ')

        contactQuery = contactQuery.or(
          `first_name.ilike.%${firstTerm}%,last_name.ilike.%${otherTerms}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        )
      }

      const { data: matchingContacts } = await contactQuery.limit(100)

      // Search for matching properties
      const { data: matchingProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(100)

      const matchingContactIds = matchingContacts?.map(c => c.id) || []
      const matchingPropertyIds = matchingProperties?.map(p => p.id) || []

      // Build search query for documents
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)

      // Search in filename, display_name, or OCR text OR linked to matching contacts/properties
      const searchConditions = [
        `filename.ilike.%${searchTerm}%`,
        `display_name.ilike.%${searchTerm}%`,
      ]

      // Add contact/property matching if found any
      if (matchingContactIds.length > 0) {
        // Find documents where any contact ID overlaps with related_contact_ids array
        matchingContactIds.forEach(contactId => {
          searchConditions.push(`related_contact_ids.cs.{${contactId}}`)
        })
      }
      if (matchingPropertyIds.length > 0) {
        // Find documents where any property ID overlaps with related_property_ids array
        matchingPropertyIds.forEach(propertyId => {
          searchConditions.push(`related_property_ids.cs.{${propertyId}}`)
        })
      }

      // Combine all search conditions with OR
      query = query.or(searchConditions.join(','))

      // Apply other filters
      if (params.entityType) {
        query = query.eq('entity_type', params.entityType)
      }
      if (params.entityId) {
        query = query.eq('entity_id', params.entityId)
      }
      if (params.documentType) {
        query = query.eq('category', params.documentType)
      }
      if (params.tags && params.tags.length > 0) {
        query = query.contains('tags', params.tags)
      }
      if (params.ocrStatus) {
        query = query.eq('ocr_status', params.ocrStatus)
      }
      if (params.hasSignature !== undefined) {
        query = query.eq('has_signature', params.hasSignature)
      }
      if (params.importanceScore) {
        query = query.eq('importance_score', params.importanceScore)
      }
      if (params.importanceScoreMin) {
        query = query.gte('importance_score', params.importanceScoreMin)
      }
      if (params.dateFrom) {
        query = query.gte('created_at', params.dateFrom.toISOString())
      }
      if (params.dateTo) {
        query = query.lte('created_at', params.dateTo.toISOString())
      }

      // Sorting
      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder || 'desc'
      const sortColumnMap: Record<string, string> = {
        filename: 'filename',
        createdAt: 'created_at',
        importanceScore: 'importance_score',
        ocrProcessedAt: 'ocr_processed_at',
        documentDate: 'document_date',
        dueDate: 'due_date',
      }
      const sortColumn = sortColumnMap[sortBy] || 'created_at'
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      // Pagination
      const limit = params.limit || 50
      const offset = params.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        console.error('[DocumentsRepository] Error searching documents:', error)
        throw new Error(`Failed to search documents: ${error.message}`)
      }

      return this.attachContactsToDocuments(data || [])
    }

    // No search query - use standard filtering
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)

    // Entity filters
    if (params.entityType) {
      query = query.eq('entity_type', params.entityType)
    }
    if (params.entityId) {
      query = query.eq('entity_id', params.entityId)
    }

    // Metadata filters
    if (params.documentType) {
      query = query.eq('category', params.documentType)
    }
    if (params.tags && params.tags.length > 0) {
      query = query.contains('tags', params.tags)
    }
    if (params.ocrStatus) {
      query = query.eq('ocr_status', params.ocrStatus)
    }
    if (params.hasSignature !== undefined) {
      query = query.eq('has_signature', params.hasSignature)
    }

    // Importance filters
    if (params.importanceScore) {
      query = query.eq('importance_score', params.importanceScore)
    }
    if (params.importanceScoreMin) {
      query = query.gte('importance_score', params.importanceScoreMin)
    }

    // Date range filters
    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom.toISOString())
    }
    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo.toISOString())
    }

    // Sorting
    const sortBy = params.sortBy || 'created_at'
    const sortOrder = params.sortOrder || 'desc'
    const sortColumnMap: Record<string, string> = {
      filename: 'filename',
      createdAt: 'created_at',
      importanceScore: 'importance_score',
      ocrProcessedAt: 'ocr_processed_at',
      documentDate: 'document_date',
      dueDate: 'due_date',
    }
    const sortColumn = sortColumnMap[sortBy] || 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Pagination
    const limit = params.limit || 50
    const offset = params.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('[DocumentsRepository] Error searching documents:', error)
      throw new Error(`Failed to search documents: ${error.message}`)
    }

    return this.attachContactsToDocuments(data || [])
  }

  /**
   * Map database row to Document type
   */
  private mapToDocument(row: any, contactsMap?: Map<string, any>): Document {
    return {
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      displayName: row.display_name || row.filename, // Use display name or fall back to filename
      fileUrl: row.file_url,
      fileSize: row.file_size,
      fileType: row.mime_type,
      entityType: row.entity_type,
      entityId: row.entity_id,

      // Metadata fields (category → documentType mapping)
      documentType: row.category, // DB column is 'category', TS field is 'documentType'
      documentDate: row.document_date ? new Date(row.document_date) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      description: row.description,
      tags: row.tags || [],

      uploadedBy: row.uploaded_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),

      // OCR fields
      ocrText: row.ocr_text,
      ocrStatus: row.ocr_status || 'pending',
      ocrProcessedAt: row.ocr_processed_at ? new Date(row.ocr_processed_at) : undefined,

      // AI metadata fields
      aiMetadata: row.ai_metadata,
      aiConfidence: row.ai_confidence,
      aiProcessedAt: row.ai_processed_at ? new Date(row.ai_processed_at) : undefined,

      // Document intelligence fields
      hasSignature: row.has_signature || false,
      signatureStatus: row.signature_status,
      importanceScore: row.importance_score,
      extractedNames: row.extracted_names || [],
      extractedDates: (row.extracted_dates || []).map((d: string) => new Date(d)),
      relatedContactIds: row.related_contact_ids || [],
      relatedPropertyIds: row.related_property_ids || [],

      // Hydrate contacts if map is provided
      relatedContacts: contactsMap
        ? (row.related_contact_ids || [])
          .map((id: string) => contactsMap.get(id))
          .filter((c: any) => c !== undefined)
        : undefined,
    }
  }

  /**
   * Helper to fetch and attach related contacts to a list of documents
   * Prevents N+1 query problem by fetching all needed contacts in one batch
   */
  private async attachContactsToDocuments(documents: any[]): Promise<Document[]> {
    if (!documents.length) return []

    // 1. Collect all unique contact IDs
    const contactIds = new Set<string>()
    documents.forEach(doc => {
      if (doc.related_contact_ids && Array.isArray(doc.related_contact_ids)) {
        doc.related_contact_ids.forEach((id: string) => contactIds.add(id))
      }
    })

    if (contactIds.size === 0) {
      return documents.map(d => this.mapToDocument(d))
    }

    // 2. Fetch contacts in batch
    const supabase = await createClient()
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, profile_picture_url')
      .in('id', Array.from(contactIds))

    // 3. Create lookup map
    const contactsMap = new Map()
    contacts?.forEach(c => {
      contactsMap.set(c.id, {
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        profilePictureUrl: c.profile_picture_url
      })
    })

    // 4. Map documents with contacts
    return documents.map(d => this.mapToDocument(d, contactsMap))
  }
}

export const documentsRepository = new DocumentsRepository()
