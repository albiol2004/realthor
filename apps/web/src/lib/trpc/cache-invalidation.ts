/**
 * Cache Invalidation Utilities
 *
 * Centralized cache invalidation logic to ensure UI updates
 * automatically after any mutations (create, update, delete).
 *
 * This is critical for desktop/Electron apps where users expect
 * immediate UI updates without manual refresh.
 *
 * IMPORTANT: Use specific instance invalidation when possible to avoid
 * refetching unnecessary data. This improves responsiveness dramatically.
 */

import { trpc } from '@/lib/trpc/client'

type TRPCUtils = ReturnType<typeof trpc.useUtils>

/**
 * Specific instance invalidation options
 */
interface InvalidateDocumentOptions {
  documentId?: string
  entityType?: 'contact' | 'property' | 'deal'
  entityId?: string
}

interface InvalidateContactOptions {
  contactId?: string
}

interface InvalidateDealOptions {
  dealId?: string
}

interface InvalidatePropertyOptions {
  propertyId?: string
}

/**
 * Invalidate all contact-related queries
 * Call this after any contact mutation (create, update, delete)
 *
 * @param utils - tRPC utils from useUtils()
 * @param options - Optional specific instance to invalidate
 */
export function invalidateContactQueries(
  utils: TRPCUtils,
  options?: InvalidateContactOptions
) {
  // Invalidate contact lists (always)
  utils.contacts.list.invalidate()

  // Invalidate specific contact or all contacts
  if (options?.contactId) {
    utils.contacts.getById.invalidate({ id: options.contactId })
  } else {
    utils.contacts.getById.invalidate()
  }

  // Invalidate related entities that might show contact info
  utils.deals.list.invalidate() // Deals show contact names
  utils.documents.listByEntity.invalidate() // Documents can be linked to contacts
  utils.documents.search.invalidate() // Search results include contact docs
}

/**
 * Invalidate all deal-related queries
 * Call this after any deal mutation (create, update, delete)
 *
 * @param utils - tRPC utils from useUtils()
 * @param options - Optional specific instance to invalidate
 */
export function invalidateDealQueries(
  utils: TRPCUtils,
  options?: InvalidateDealOptions
) {
  // Invalidate deal lists (always)
  utils.deals.list.invalidate()

  // Invalidate specific deal or all deals
  if (options?.dealId) {
    utils.deals.getById.invalidate({ id: options.dealId })
    utils.deals.getCompliance.invalidate({ dealId: options.dealId })
  } else {
    utils.deals.getById.invalidate()
    utils.deals.getCompliance.invalidate()
  }

  // Invalidate contact views (they show deals)
  utils.contacts.getById.invalidate()

  // Invalidate documents (compliance calculation depends on documents)
  utils.documents.listByEntity.invalidate()
}

/**
 * Invalidate all document-related queries
 * Call this after any document mutation (upload, update, delete)
 *
 * @param utils - tRPC utils from useUtils()
 * @param options - Optional specific instance to invalidate
 */
export function invalidateDocumentQueries(
  utils: TRPCUtils,
  options?: InvalidateDocumentOptions
) {
  // Always invalidate search (affects all views)
  utils.documents.search.invalidate()

  // Invalidate specific document or all documents
  if (options?.documentId) {
    utils.documents.getById.invalidate({ id: options.documentId })
  } else {
    utils.documents.getById.invalidate()
  }

  // Invalidate entity-specific lists if provided
  if (options?.entityType && options?.entityId) {
    utils.documents.listByEntity.invalidate({
      entityType: options.entityType,
      entityId: options.entityId,
    })
  } else {
    utils.documents.listByEntity.invalidate()
  }

  // Invalidate compliance scores (they depend on documents)
  utils.deals.getCompliance.invalidate()

  // Invalidate contact views (they show document counts and compliance)
  utils.contacts.getById.invalidate()
}

/**
 * Invalidate all property-related queries
 * Call this after any property mutation (create, update, delete)
 *
 * @param utils - tRPC utils from useUtils()
 * @param options - Optional specific instance to invalidate
 */
export function invalidatePropertyQueries(
  utils: TRPCUtils,
  options?: InvalidatePropertyOptions
) {
  // Invalidate property lists (always)
  utils.properties.list.invalidate()

  // Invalidate specific property or all properties
  if (options?.propertyId) {
    utils.properties.getById.invalidate({ id: options.propertyId })
  } else {
    utils.properties.getById.invalidate()
  }

  // Invalidate deals (they show property info)
  utils.deals.list.invalidate()
  utils.deals.getById.invalidate()

  // Invalidate documents (can be linked to properties)
  utils.documents.listByEntity.invalidate()
  utils.documents.search.invalidate()
}

/**
 * Nuclear option: Invalidate everything
 * Use when you're not sure what was affected or for major operations
 */
export function invalidateAllQueries(utils: TRPCUtils) {
  utils.contacts.invalidate()
  utils.deals.invalidate()
  utils.documents.invalidate()
  utils.properties.invalidate()
}
