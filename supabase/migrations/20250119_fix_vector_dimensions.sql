-- ============================================================================
-- Migration: Fix Vector Dimensions to Match VPS OCR Service
-- Description: Change from 1536 to 384 dimensions (sentence-transformers MiniLM)
-- Date: 2025-01-19
-- ============================================================================

-- Drop the HNSW index first (depends on the column)
DROP INDEX IF EXISTS document_embeddings_vector_idx;

-- Drop the embedding column
ALTER TABLE document_embeddings DROP COLUMN IF EXISTS embedding;

-- Add embedding column with correct dimensions (384 for MiniLM)
ALTER TABLE document_embeddings
  ADD COLUMN embedding vector(384);

-- Recreate HNSW index for fast similarity search
CREATE INDEX document_embeddings_vector_idx ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Add comment
COMMENT ON COLUMN document_embeddings.embedding IS
'384-dimensional embedding from paraphrase-multilingual-MiniLM-L12-v2 model';
