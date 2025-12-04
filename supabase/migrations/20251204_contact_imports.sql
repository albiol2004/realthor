-- =============================================
-- Contact Import System
-- =============================================
-- Enables CSV/Excel contact import with:
-- - AI-powered column mapping
-- - Duplicate detection
-- - Three import modes: safe, balanced, turbo
-- - Review interface for conflicts
-- =============================================

-- Import job status enum
CREATE TYPE contact_import_status AS ENUM (
    'pending',           -- Just created, waiting for processing
    'analyzing',         -- Parsing CSV, AI mapping, finding duplicates
    'pending_review',    -- Analysis complete, waiting for user review (safe/balanced modes)
    'processing',        -- Executing the import (creating/updating contacts)
    'completed',         -- Import finished successfully
    'failed'             -- Import failed with error
);

-- Import mode enum
CREATE TYPE contact_import_mode AS ENUM (
    'safe',      -- Review every contact before import
    'balanced',  -- Only review duplicates and conflicts
    'turbo'      -- Import all without review
);

-- Row status enum (analysis result)
CREATE TYPE contact_import_row_status AS ENUM (
    'new',        -- No match found, will create new contact
    'duplicate',  -- Exact match found, no conflicts
    'conflict',   -- Match found with conflicting data
    'imported',   -- Successfully imported/updated
    'skipped'     -- User chose to skip
);

-- User decision enum
CREATE TYPE contact_import_decision AS ENUM (
    'create',    -- Create as new contact (even if duplicate)
    'update',    -- Update existing contact
    'skip'       -- Skip this row
);

-- =============================================
-- Main import jobs table
-- =============================================
CREATE TABLE contact_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Job status and mode
    status contact_import_status NOT NULL DEFAULT 'pending',
    mode contact_import_mode NOT NULL,

    -- File info
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,  -- Supabase Storage URL
    file_size_bytes INTEGER,

    -- AI column mapping result
    -- Format: {"csv_column_name": "contact_field_name", ...}
    -- Example: {"Nombre": "first_name", "Email": "email", "Telefono": "phone"}
    column_mapping JSONB,

    -- Headers from CSV (for reference)
    csv_headers TEXT[],

    -- Analysis stats (populated after analysis phase)
    total_rows INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,

    -- Final import stats (populated after processing phase)
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Error handling
    error_message TEXT,

    -- VPS processing info
    vps_instance_id TEXT,
    processing_started_at TIMESTAMPTZ
);

-- =============================================
-- Individual rows from CSV
-- =============================================
CREATE TABLE contact_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES contact_import_jobs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,  -- 1-indexed row number from CSV

    -- Original data from CSV
    -- Format: {"Column A": "value1", "Column B": "value2", ...}
    raw_data JSONB NOT NULL,

    -- Data after AI mapping applied
    -- Format: {"first_name": "Juan", "last_name": "Garcia", "email": "juan@...", ...}
    mapped_data JSONB,

    -- Analysis result
    status contact_import_row_status NOT NULL DEFAULT 'new',

    -- If duplicate/conflict found, reference to existing contact
    matched_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- Match confidence score (0-1)
    match_confidence NUMERIC(3,2),

    -- For conflicts: which fields have different values
    -- Format: [{"field": "phone", "existing": "+34...", "new": "+34...", "keep": null}, ...]
    conflicts JSONB,

    -- User decision (for review)
    decision contact_import_decision,

    -- Which fields to overwrite (when decision = 'update')
    -- Format: ["phone", "company", "notes"]
    overwrite_fields TEXT[],

    -- Result after import
    created_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    import_error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes for performance
-- =============================================

-- Jobs by user and status (for listing)
CREATE INDEX idx_contact_import_jobs_user_status
ON contact_import_jobs(user_id, status);

-- Jobs by status (for VPS polling)
CREATE INDEX idx_contact_import_jobs_status
ON contact_import_jobs(status)
WHERE status IN ('pending', 'analyzing', 'processing');

-- Jobs by created_at (for sorting)
CREATE INDEX idx_contact_import_jobs_created_at
ON contact_import_jobs(created_at DESC);

-- Rows by job (for fetching all rows of a job)
CREATE INDEX idx_contact_import_rows_job
ON contact_import_rows(job_id);

-- Rows by job and status (for filtering during review)
CREATE INDEX idx_contact_import_rows_job_status
ON contact_import_rows(job_id, status);

-- Rows needing review
CREATE INDEX idx_contact_import_rows_needs_review
ON contact_import_rows(job_id)
WHERE status IN ('duplicate', 'conflict') AND decision IS NULL;

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE contact_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_import_rows ENABLE ROW LEVEL SECURITY;

-- Users can only see their own import jobs
CREATE POLICY "Users can view own import jobs"
ON contact_import_jobs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create import jobs
CREATE POLICY "Users can create import jobs"
ON contact_import_jobs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own import jobs (for review decisions)
CREATE POLICY "Users can update own import jobs"
ON contact_import_jobs FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own import jobs
CREATE POLICY "Users can delete own import jobs"
ON contact_import_jobs FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Rows: access through job ownership
CREATE POLICY "Users can view import rows of own jobs"
ON contact_import_rows FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM contact_import_jobs
        WHERE id = contact_import_rows.job_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update import rows of own jobs"
ON contact_import_rows FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM contact_import_jobs
        WHERE id = contact_import_rows.job_id
        AND user_id = auth.uid()
    )
);

-- =============================================
-- Service role policies (for VPS service)
-- =============================================

-- Service role can do everything (bypasses RLS by default)
-- But we add explicit policies for clarity

CREATE POLICY "Service role full access to import jobs"
ON contact_import_jobs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to import rows"
ON contact_import_rows FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- Function to get next import job for VPS processing
-- =============================================

CREATE OR REPLACE FUNCTION get_next_import_job(p_vps_instance_id TEXT)
RETURNS TABLE (
    job_id UUID,
    user_id UUID,
    mode contact_import_mode,
    file_url TEXT,
    file_name TEXT,
    status contact_import_status
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH claimed_job AS (
        SELECT j.id
        FROM contact_import_jobs j
        WHERE j.status IN ('pending', 'processing')
        ORDER BY
            -- Prioritize 'processing' jobs (resume after restart)
            CASE WHEN j.status = 'processing' THEN 0 ELSE 1 END,
            j.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE contact_import_jobs j
    SET
        status = CASE
            WHEN j.status = 'pending' THEN 'analyzing'::contact_import_status
            ELSE j.status  -- Keep 'processing' as is
        END,
        vps_instance_id = p_vps_instance_id,
        processing_started_at = COALESCE(j.processing_started_at, NOW())
    FROM claimed_job
    WHERE j.id = claimed_job.id
    RETURNING j.id, j.user_id, j.mode, j.file_url, j.file_name, j.status;
END;
$$;

-- =============================================
-- Function to update import job status
-- =============================================

CREATE OR REPLACE FUNCTION update_import_job_status(
    p_job_id UUID,
    p_status contact_import_status,
    p_error_message TEXT DEFAULT NULL,
    p_stats JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE contact_import_jobs
    SET
        status = p_status,
        error_message = p_error_message,
        analyzed_at = CASE WHEN p_status = 'pending_review' THEN NOW() ELSE analyzed_at END,
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        -- Update stats if provided
        total_rows = COALESCE((p_stats->>'total_rows')::INTEGER, total_rows),
        new_count = COALESCE((p_stats->>'new_count')::INTEGER, new_count),
        duplicate_count = COALESCE((p_stats->>'duplicate_count')::INTEGER, duplicate_count),
        conflict_count = COALESCE((p_stats->>'conflict_count')::INTEGER, conflict_count),
        created_count = COALESCE((p_stats->>'created_count')::INTEGER, created_count),
        updated_count = COALESCE((p_stats->>'updated_count')::INTEGER, updated_count),
        skipped_count = COALESCE((p_stats->>'skipped_count')::INTEGER, skipped_count)
    WHERE id = p_job_id;
END;
$$;

-- =============================================
-- Trigger to update job stats when rows change
-- =============================================

CREATE OR REPLACE FUNCTION update_import_job_row_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update the job's row counts based on current row statuses
    UPDATE contact_import_jobs
    SET
        new_count = (SELECT COUNT(*) FROM contact_import_rows WHERE job_id = NEW.job_id AND status = 'new'),
        duplicate_count = (SELECT COUNT(*) FROM contact_import_rows WHERE job_id = NEW.job_id AND status = 'duplicate'),
        conflict_count = (SELECT COUNT(*) FROM contact_import_rows WHERE job_id = NEW.job_id AND status = 'conflict')
    WHERE id = NEW.job_id;

    RETURN NEW;
END;
$$;

-- Only update counts after analysis is complete (not during bulk inserts)
-- This is called manually after analysis phase, not as a trigger
-- CREATE TRIGGER update_job_counts_on_row_change
-- AFTER INSERT OR UPDATE ON contact_import_rows
-- FOR EACH ROW
-- EXECUTE FUNCTION update_import_job_row_counts();

-- =============================================
-- Storage bucket for CSV files (if not exists)
-- =============================================

-- Note: Run this in Supabase dashboard or via separate migration
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('imports', 'imports', false)
-- ON CONFLICT DO NOTHING;

COMMENT ON TABLE contact_import_jobs IS 'CSV/Excel contact import jobs with AI mapping and duplicate detection';
COMMENT ON TABLE contact_import_rows IS 'Individual rows from CSV imports with analysis results and user decisions';
