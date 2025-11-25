/**
 * Cache Invalidation Utilities
 *
 * Centralized cache invalidation logic to ensure UI updates
 * automatically after any mutations (create, update, delete).
 *
 * This is critical for desktop/Electron apps where users expect
 * immediate UI updates without manual refresh.
 */

import { trpc } from '@/lib/trpc/client'

type TRPCUtils = ReturnType<typeof trpc.useUtils>

/**
 * Invalidate all contact-related queries
 * Call this after any contact mutation (create, update, delete)
 */
export function invalidateContactQueries(utils: TRPCUtils) {
  // Invalidate contact lists and detail
  utils.contacts.list.invalidate()
  utils.contacts.getById.invalidate()

  // Invalidate related entities that might show contact info
  utils.deals.list.invalidate() // Deals show contact names
  utils.documents.listByEntity.invalidate() // Documents can be linked to contacts
  utils.documents.search.invalidate() // Search results include contact docs
}

/**
 * Invalidate all deal-related queries
 * Call this after any deal mutation (create, update, delete)
 */
export function invalidateDealQueries(utils: TRPCUtils) {
  // Invalidate deal lists and detail
  utils.deals.list.invalidate()
  utils.deals.getById.invalidate()
  utils.deals.getCompliance.invalidate()

  // Invalidate contact views (they show deals)
  utils.contacts.getById.invalidate()

  // Invalidate documents (compliance calculation depends on documents)
  utils.documents.listByEntity.invalidate()
}

/**
 * Invalidate all document-related queries
 * Call this after any document mutation (upload, update, delete)
 */
export function invalidateDocumentQueries(utils: TRPCUtils) {
  // Invalidate document queries
  utils.documents.search.invalidate()
  utils.documents.listByEntity.invalidate()
  utils.documents.getById.invalidate()

  // Invalidate compliance scores (they depend on documents)
  utils.deals.getCompliance.invalidate()

  // Invalidate contact views (they show document counts and compliance)
  utils.contacts.getById.invalidate()
}

/**
 * Invalidate all property-related queries
 * Call this after any property mutation (create, update, delete)
 */
export function invalidatePropertyQueries(utils: TRPCUtils) {
  // Invalidate property lists and detail
  utils.properties.list.invalidate()
  utils.properties.getById.invalidate()

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
