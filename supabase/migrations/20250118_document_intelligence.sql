-- ============================================================================
-- Migration: Document Intelligence System
-- Description: Adds OCR, AI metadata extraction, and semantic search capabilities
-- Date: 2025-01-18
-- ============================================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Enhance Documents Table with Intelligence Fields
-- ============================================================================

-- Add OCR fields
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ocr_status text DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS ocr_processed_at timestamptz;

-- Add AI metadata fields
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz;

-- Add document intelligence fields
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS has_signature boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_status text CHECK (signature_status IN ('unsigned', 'partially_signed', 'fully_signed')),
  ADD COLUMN IF NOT EXISTS importance_score integer CHECK (importance_score >= 1 AND importance_score <= 5),
  ADD COLUMN IF NOT EXISTS extracted_names text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extracted_dates date[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_contact_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_property_ids uuid[] DEFAULT '{}';

-- Add full-text search index on OCR text
CREATE INDEX IF NOT EXISTS documents_ocr_text_idx ON documents
  USING gin(to_tsvector('spanish', coalesce(ocr_text, '')));

-- Add index for AI metadata queries
CREATE INDEX IF NOT EXISTS documents_ai_metadata_idx ON documents USING gin(ai_metadata);

-- Add index for OCR status (for queue processing)
CREATE INDEX IF NOT EXISTS documents_ocr_status_idx ON documents(ocr_status) WHERE ocr_status != 'completed';

-- Add index for importance score
CREATE INDEX IF NOT EXISTS documents_importance_score_idx ON documents(importance_score DESC);

-- ============================================================================
-- Document Embeddings Table (Semantic Search)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Embedding data (384 dimensions for multilingual-MiniLM - lightweight model)
  embedding vector(384),
  content_hash text NOT NULL,

  -- Chunk information (for large documents)
  chunk_index integer DEFAULT 0,
  chunk_text text NOT NULL,
  chunk_length integer NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(document_id, chunk_index)
);

-- HNSW index for blazing fast vector similarity search
-- Using cosine distance (best for normalized embeddings)
CREATE INDEX IF NOT EXISTS document_embeddings_vector_idx ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Other indexes for filtering
CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS document_embeddings_user_id_idx ON document_embeddings(user_id);
CREATE INDEX IF NOT EXISTS document_embeddings_created_at_idx ON document_embeddings(created_at DESC);

-- ============================================================================
-- OCR Processing Queue Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ocr_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Queue metadata
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=lowest, 10=highest
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,

  -- Processing details
  vps_instance_id text, -- Which VPS instance is processing this
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(document_id)
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS ocr_queue_status_priority_idx ON ocr_queue(status, priority DESC, created_at ASC)
  WHERE status IN ('queued', 'retrying');

CREATE INDEX IF NOT EXISTS ocr_queue_user_id_idx ON ocr_queue(user_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_queue ENABLE ROW LEVEL SECURITY;

-- Document Embeddings RLS
CREATE POLICY "Users can view their own embeddings"
  ON document_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
  ON document_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings"
  ON document_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
  ON document_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- OCR Queue RLS
CREATE POLICY "Users can view their own queue items"
  ON ocr_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items"
  ON ocr_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all queue items"
  ON ocr_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function for semantic document search
CREATE OR REPLACE FUNCTION search_documents_by_embedding(
  query_embedding vector(384),
  user_id_param uuid,
  match_threshold numeric DEFAULT 0.6,
  match_count integer DEFAULT 20
)
RETURNS TABLE (
  document_id uuid,
  filename text,
  file_url text,
  category text,
  similarity numeric,
  chunk_text text,
  chunk_index integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.document_id,
    d.filename,
    d.file_url,
    d.category,
    (1 - (de.embedding <=> query_embedding))::numeric as similarity,
    de.chunk_text,
    de.chunk_index
  FROM document_embeddings de
  JOIN documents d ON d.id = de.document_id
  WHERE
    de.user_id = user_id_param
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next OCR job from queue
CREATE OR REPLACE FUNCTION get_next_ocr_job(
  vps_instance_id_param text
)
RETURNS TABLE (
  queue_id uuid,
  document_id uuid,
  file_url text,
  file_type text
) AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Get the next job with row-level locking
  SELECT oq.id, oq.document_id, d.file_url, d.file_type
  INTO job_record
  FROM ocr_queue oq
  JOIN documents d ON d.id = oq.document_id
  WHERE oq.status IN ('queued', 'retrying')
    AND oq.attempts < oq.max_attempts
  ORDER BY oq.priority DESC, oq.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If no job found, return empty
  IF job_record IS NULL THEN
    RETURN;
  END IF;

  -- Update job status to processing
  UPDATE ocr_queue
  SET
    status = 'processing',
    vps_instance_id = vps_instance_id_param,
    started_at = now(),
    attempts = attempts + 1,
    updated_at = now()
  WHERE id = job_record.id;

  -- Return job details
  RETURN QUERY
  SELECT
    job_record.id,
    job_record.document_id,
    job_record.file_url,
    job_record.file_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update OCR job status
CREATE OR REPLACE FUNCTION update_ocr_job_status(
  queue_id_param uuid,
  new_status text,
  error_message_param text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE ocr_queue
  SET
    status = new_status,
    completed_at = CASE WHEN new_status IN ('completed', 'failed') THEN now() ELSE NULL END,
    error_message = error_message_param,
    updated_at = now()
  WHERE id = queue_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to auto-create OCR queue entry when document is created
CREATE OR REPLACE FUNCTION auto_queue_document_for_ocr()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue documents that need OCR (PDFs, images)
  IF NEW.file_type IN ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff') THEN
    INSERT INTO ocr_queue (document_id, user_id, priority)
    VALUES (NEW.id, NEW.user_id, 5) -- Default medium priority
    ON CONFLICT (document_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_auto_queue_trigger
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_queue_document_for_ocr();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE document_embeddings IS 'Vector embeddings for semantic search using lightweight multilingual model (384d)';
COMMENT ON TABLE ocr_queue IS 'Queue for OCR processing jobs with retry logic and VPS instance tracking';
COMMENT ON COLUMN documents.ocr_text IS 'Extracted text from OCR (PaddleOCR + PP-Structure)';
COMMENT ON COLUMN documents.ai_metadata IS 'AI-extracted metadata: names, dates, signatures, importance (Deepseek)';
COMMENT ON COLUMN documents.importance_score IS 'AI-assessed importance: 1=low, 5=critical';
COMMENT ON FUNCTION search_documents_by_embedding IS 'Semantic search using cosine similarity with HNSW index (sub-50ms)';
COMMENT ON FUNCTION get_next_ocr_job IS 'Thread-safe job dequeuing with row-level locking';
