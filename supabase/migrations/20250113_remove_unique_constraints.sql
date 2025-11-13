-- Migration: Remove unnecessary unique constraints from agent and company tables
-- Issue: name and phone fields should not be unique as multiple users can have the same name/phone
-- Date: 2025-01-13

-- ============================================
-- AGENT TABLE - Remove unique constraints
-- ============================================

-- Remove unique constraint on name (multiple agents can have the same name)
ALTER TABLE public.agent DROP CONSTRAINT IF EXISTS agent_name_key;

-- Remove unique constraint on phone (multiple agents could share a phone, or have similar numbers)
ALTER TABLE public.agent DROP CONSTRAINT IF EXISTS agent_phone_key;

-- ============================================
-- COMPANY TABLE - Remove unique constraints
-- ============================================

-- Remove unique constraint on name (multiple companies can have similar names)
ALTER TABLE public.company DROP CONSTRAINT IF EXISTS company_name_key;

-- ============================================
-- NOTES
-- ============================================
-- The email unique constraints are kept as they should remain unique for authentication
-- userID remains the primary key and is unique by design
