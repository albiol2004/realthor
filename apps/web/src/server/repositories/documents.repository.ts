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

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        filename: input.filename,
        file_url: input.fileUrl,
        file_size: input.fileSize || null,
        file_type: input.fileType || null,
        entity_type: input.entityType,
        entity_id: input.entityId,
        category: input.category || null,
        tags: input.tags || [],
        description: input.description || null,
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
    if (input.category !== undefined) updateData.category = input.category || null
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.description !== undefined) updateData.description = input.description || null

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
      category: row.category,
      tags: row.tags || [],
      description: row.description,
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
      extractedDates: row.extracted_dates || [],
      relatedContactIds: row.related_contact_ids || [],
      relatedPropertyIds: row.related_property_ids || [],
    }
  }
}

export const documentsRepository = new DocumentsRepository()
