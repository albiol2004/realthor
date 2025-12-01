-- Row Level Security (RLS) Policies for Email Integration
-- Run this SQL in your Supabase SQL Editor

-- ===================================
-- Enable RLS on Tables
-- ===================================

ALTER TABLE "kairo_email_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kairo_emails" ENABLE ROW LEVEL SECURITY;

-- ===================================
-- Email Accounts Policies
-- ===================================

-- Policy: Users can view only their own email accounts
CREATE POLICY "Users can view own email accounts"
ON "kairo_email_accounts"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own email accounts
CREATE POLICY "Users can insert own email accounts"
ON "kairo_email_accounts"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own email accounts
CREATE POLICY "Users can update own email accounts"
ON "kairo_email_accounts"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own email accounts
CREATE POLICY "Users can delete own email accounts"
ON "kairo_email_accounts"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ===================================
-- Emails Policies
-- ===================================

-- Policy: Users can view only their own emails
CREATE POLICY "Users can view own emails"
ON "kairo_emails"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own emails
CREATE POLICY "Users can insert own emails"
ON "kairo_emails"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own emails
CREATE POLICY "Users can update own emails"
ON "kairo_emails"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own emails
CREATE POLICY "Users can delete own emails"
ON "kairo_emails"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ===================================
-- Verify RLS is enabled
-- ===================================

-- You can run this to check RLS status:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('kairo_email_accounts', 'kairo_emails');
