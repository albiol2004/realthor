-- Migration: Add deal_type field to deals table
-- Created: 2025-01-24
-- Description: Adds deal_type enum to support different transaction types with specific compliance requirements

-- Create deal_type enum
CREATE TYPE deal_type AS ENUM (
  'residential_resale',    -- Second-hand residential
  'new_development',       -- New build from developer
  'residential_rental',    -- Residential rental (LAU)
  'commercial',            -- Commercial & retail (locales & traspasos)
  'rural_land'            -- Rural properties & land (rustica/terrenos)
);

-- Add deal_type column to deals table
ALTER TABLE deals
ADD COLUMN deal_type deal_type DEFAULT 'residential_resale';

-- Add comment explaining the field
COMMENT ON COLUMN deals.deal_type IS 'Type of real estate transaction - determines compliance requirements and document checklist';

-- Create index for filtering by deal type
CREATE INDEX deals_deal_type_idx ON deals(deal_type);

-- Create composite index for common queries (user_id + deal_type)
CREATE INDEX deals_user_type_idx ON deals(user_id, deal_type);
