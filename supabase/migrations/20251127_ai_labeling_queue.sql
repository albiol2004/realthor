-- AI Labeling Queue
-- Queue system for AI-powered document labeling
-- Triggered automatically after OCR or manually by users

CREATE TABLE IF NOT EXISTS public.ai_labeling_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('auto', 'manual')),
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  processing_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Index for finding pending/processing jobs
CREATE INDEX IF NOT EXISTS ai_labeling_queue_status_idx
  ON ai_labeling_queue(status, created_at)
  WHERE status IN ('pending', 'processing');

-- Index for finding jobs by document
CREATE INDEX IF NOT EXISTS ai_labeling_queue_document_id_idx
  ON ai_labeling_queue(document_id);

-- Index for finding user's jobs
CREATE INDEX IF NOT EXISTS ai_labeling_queue_user_id_idx
  ON ai_labeling_queue(user_id, created_at DESC);

-- Prevent duplicate pending jobs for same document
CREATE UNIQUE INDEX IF NOT EXISTS ai_labeling_queue_document_pending_idx
  ON ai_labeling_queue(document_id)
  WHERE status IN ('pending', 'processing');

-- Add comment
COMMENT ON TABLE ai_labeling_queue IS 'Queue for AI-powered document labeling jobs';

-- RLS Policies
ALTER TABLE ai_labeling_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own AI labeling jobs"
  ON ai_labeling_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create jobs for their own documents
CREATE POLICY "Users can create AI labeling jobs"
  ON ai_labeling_queue
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update any job (for VPS worker)
CREATE POLICY "Service role can update AI labeling jobs"
  ON ai_labeling_queue
  FOR UPDATE
  USING (true);
