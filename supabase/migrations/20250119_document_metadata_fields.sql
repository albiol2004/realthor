-- ============================================================================
-- Migration: Enhanced Document Metadata Fields
-- Description: Adds document_date, due_date for Spanish real estate compliance
-- Date: 2025-11-19
-- ============================================================================

-- Add document date fields
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS document_date date,
  ADD COLUMN IF NOT EXISTS due_date date;

-- Add indexes for date-based queries
CREATE INDEX IF NOT EXISTS documents_document_date_idx ON documents(document_date DESC);
CREATE INDEX IF NOT EXISTS documents_due_date_idx ON documents(due_date ASC)
  WHERE due_date IS NOT NULL;

-- Add index for related contacts/properties (already exist but add indexes)
CREATE INDEX IF NOT EXISTS documents_related_contact_ids_idx ON documents
  USING gin(related_contact_ids);
CREATE INDEX IF NOT EXISTS documents_related_property_ids_idx ON documents
  USING gin(related_property_ids);

-- Comments for documentation
COMMENT ON COLUMN documents.document_date IS 'Date when document was created, signed, or issued';
COMMENT ON COLUMN documents.due_date IS 'Date when document expires or action is due (e.g., permit expiration, payment due)';
COMMENT ON COLUMN documents.related_contact_ids IS 'Contacts mentioned or related to this document (fuzzy search linkable)';
COMMENT ON COLUMN documents.related_property_ids IS 'Properties mentioned or related to this document (fuzzy search linkable)';
