-- ============================================================================
-- Migration: Fix Documents Table for Standalone Documents
-- Description: Make entity_type and entity_id optional for standalone documents
-- Date: 2025-01-19
-- ============================================================================

-- Make entity_type and entity_id nullable (allow standalone documents)
ALTER TABLE documents
  ALTER COLUMN entity_type DROP NOT NULL,
  ALTER COLUMN entity_id DROP NOT NULL;

-- Add mime_type as alias for file_type (backward compatibility)
-- This allows code to use either mime_type or file_type
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS mime_type text;

-- Update existing records to sync mime_type with file_type
UPDATE documents SET mime_type = file_type WHERE mime_type IS NULL;

-- Create trigger to keep mime_type and file_type in sync
CREATE OR REPLACE FUNCTION sync_file_type_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If mime_type is set, copy to file_type
  IF NEW.mime_type IS NOT NULL THEN
    NEW.file_type = NEW.mime_type;
  END IF;

  -- If file_type is set, copy to mime_type
  IF NEW.file_type IS NOT NULL THEN
    NEW.mime_type = NEW.file_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_file_type_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION sync_file_type_columns();

-- Add index for standalone documents (where entity_type IS NULL)
CREATE INDEX IF NOT EXISTS documents_standalone_idx ON documents(user_id, created_at DESC)
  WHERE entity_type IS NULL;

-- Update auto-queue trigger to include new queue fields
DROP TRIGGER IF EXISTS document_auto_queue_trigger ON documents;

CREATE OR REPLACE FUNCTION auto_queue_document_for_ocr()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue documents that need OCR (PDFs, images)
  IF COALESCE(NEW.file_type, NEW.mime_type) IN ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff') THEN
    INSERT INTO ocr_queue (document_id, user_id, file_url, file_type, priority)
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.file_url,
      COALESCE(NEW.file_type, NEW.mime_type),
      5 -- Default medium priority
    )
    ON CONFLICT (document_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_auto_queue_trigger
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_queue_document_for_ocr();

-- Add missing file_url and file_type columns to ocr_queue if they don't exist
ALTER TABLE ocr_queue
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_type text;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN documents.entity_type IS 'Optional: type of related entity (contact, property, deal) - NULL for standalone documents';
COMMENT ON COLUMN documents.entity_id IS 'Optional: ID of related entity - NULL for standalone documents';
COMMENT ON COLUMN documents.mime_type IS 'MIME type (kept in sync with file_type for backward compatibility)';
