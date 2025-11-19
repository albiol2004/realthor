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
   */
  async listByEntity(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<Document[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DocumentsRepository] Error listing documents:', error)
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    return (data || []).map(this.mapToDocument)
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

    return (data || []).map(this.mapToDocument)
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

    const { data, error} = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        filename: input.filename,
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

    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)

    // Full-text search on filename and OCR text
    if (params.query && params.query.trim()) {
      // Use PostgreSQL full-text search (GIN index already exists on ocr_text)
      query = query.textSearch('ocr_text', params.query, {
        type: 'websearch',
        config: 'spanish',
      })
      // Also search in filename
      query = query.or(`filename.ilike.%${params.query}%`)
    }

    // Entity filters
    if (params.entityType) {
      query = query.eq('entity_type', params.entityType)
    }
    if (params.entityId) {
      query = query.eq('entity_id', params.entityId)
    }

    // Metadata filters
    if (params.documentType) {
      query = query.eq('category', params.documentType) // documentType → category in DB
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

    // Map sortBy to database column names
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

    return (data || []).map(this.mapToDocument)
  }

  /**
   * Map database row to Document type
   */
  private mapToDocument(row: any): Document {
    return {
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
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
    }
  }
}

export const documentsRepository = new DocumentsRepository()
