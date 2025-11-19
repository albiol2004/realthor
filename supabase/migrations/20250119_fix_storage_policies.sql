-- ============================================================================
-- Migration: Fix Storage RLS Policies for Documents Bucket
-- Description: Create correct RLS policies for authenticated user access
-- Date: 2025-01-19
-- ============================================================================

-- Drop any existing policies for documents bucket (clean slate)
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents only" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all documents" ON storage.objects;

-- ============================================================================
-- Create Correct Policies
-- ============================================================================

-- Policy 1: Allow INSERT (upload) to user's own folder
CREATE POLICY "Authenticated users can upload to their own folder in documents bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow SELECT (read) from user's own folder only
CREATE POLICY "Authenticated users can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow UPDATE on user's own files (for metadata updates)
CREATE POLICY "Authenticated users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow DELETE from user's own folder
CREATE POLICY "Authenticated users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Verify RLS is enabled
-- ============================================================================

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Authenticated users can upload to their own folder in documents bucket" ON storage.objects
IS 'Users can only upload files to folders named with their user ID (e.g., {user_id}/filename.pdf)';

COMMENT ON POLICY "Authenticated users can read their own documents" ON storage.objects
IS 'Users can only read files from their own folder, ensuring document privacy';
