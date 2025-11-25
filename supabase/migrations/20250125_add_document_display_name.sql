-- Add display_name column to documents table
-- This allows users to set custom names for documents while preserving original filename

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Set display_name to filename for existing documents (migration safety)
UPDATE documents 
SET display_name = filename 
WHERE display_name IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.display_name IS 'User-friendly display name for the document. Falls back to filename if not set.';
