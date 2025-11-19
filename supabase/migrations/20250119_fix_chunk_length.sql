-- ============================================================================
-- Migration: Fix missing chunk_length column
-- Description: Add chunk_length if it doesn't exist
-- Date: 2025-01-19
-- ============================================================================

-- Add chunk_length column if missing
ALTER TABLE document_embeddings
  ADD COLUMN IF NOT EXISTS chunk_length integer NOT NULL DEFAULT 0;

-- Update existing rows to have correct chunk_length based on chunk_text
UPDATE document_embeddings
SET chunk_length = LENGTH(chunk_text)
WHERE chunk_length = 0;

-- Remove default now that existing rows are fixed
ALTER TABLE document_embeddings
  ALTER COLUMN chunk_length DROP DEFAULT;
