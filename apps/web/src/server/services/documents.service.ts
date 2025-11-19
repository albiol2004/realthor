import { documentsRepository } from '@/server/repositories/documents.repository'
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  EntityType,
} from '@/types/crm'
import { TRPCError } from '@trpc/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Documents Service
 * Business logic for document management
 */
export class DocumentsService {
  /**
   * List documents for a specific entity (contact, property, deal)
   */
  async listByEntity(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<Document[]> {
    return await documentsRepository.listByEntity(userId, entityType, entityId)
  }

  /**
   * List all documents for a user
   */
  async listAll(userId: string): Promise<Document[]> {
    return await documentsRepository.listAll(userId)
  }

  /**
   * Get a document by ID
   */
  async getById(userId: string, documentId: string): Promise<Document> {
    const document = await documentsRepository.findById(userId, documentId)

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    return document
  }

  /**
   * Create a new document
   */
  async create(userId: string, input: CreateDocumentInput): Promise<Document> {
    // Validate file URL
    if (!input.fileUrl.startsWith('http')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid file URL',
      })
    }

    // Validate file size (max 100MB)
    if (input.fileSize && input.fileSize > 100 * 1024 * 1024) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'File size exceeds 100MB limit',
      })
    }

    return await documentsRepository.create(userId, input)
  }

  /**
   * Update a document
   */
  async update(userId: string, input: UpdateDocumentInput): Promise<Document> {
    // Check if document exists
    const existing = await documentsRepository.findById(userId, input.id)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    // Validate file URL if provided
    if (input.fileUrl && !input.fileUrl.startsWith('http')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid file URL',
      })
    }

    // Validate file size if provided
    if (input.fileSize && input.fileSize > 100 * 1024 * 1024) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'File size exceeds 100MB limit',
      })
    }

    return await documentsRepository.update(userId, input)
  }

  /**
   * Delete a document
   */
  async delete(userId: string, documentId: string): Promise<void> {
    // Check if document exists
    const existing = await documentsRepository.findById(userId, documentId)
    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      })
    }

    // Delete file from Supabase Storage
    // Extract storage path from file URL (format: userId/filename)
    try {
      const supabase = await createClient()
      const urlParts = existing.fileUrl.split('/documents/')
      if (urlParts.length > 1) {
        // Get the path after '/documents/' (e.g., "userId/filename.pdf")
        const storagePath = urlParts[1].split('?')[0] // Remove query params

        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([storagePath])

        if (storageError) {
          console.error('Failed to delete storage file:', storageError)
          // Don't throw - still delete DB record even if storage fails
        }
      }
    } catch (error) {
      console.error('Error deleting storage file:', error)
      // Don't throw - still delete DB record even if storage fails
    }

    // Delete database record (cascades to embeddings and queue entries)
    await documentsRepository.delete(userId, documentId)
  }

  /**
   * Smart filtered search with full-text search
   */
  async search(userId: string, params: {
    query?: string
    entityType?: EntityType
    entityId?: string
    documentType?: string
    tags?: string[]
    ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed'
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
    return await documentsRepository.search(userId, params)
  }
}

export const documentsService = new DocumentsService()
