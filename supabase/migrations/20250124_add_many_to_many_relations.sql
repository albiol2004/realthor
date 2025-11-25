-- Migration: Add many-to-many relations for Deals
-- Deals can have multiple contacts and multiple properties
-- This replaces the single contact_id and property_id foreign keys with junction tables

-- ============================================================================
-- Step 1: Create deal_contacts junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deal_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  role TEXT NULL, -- e.g., 'buyer', 'seller', 'agent', 'lawyer', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT deal_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT deal_contacts_deal_id_contact_id_key UNIQUE (deal_id, contact_id),
  CONSTRAINT deal_contacts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
  CONSTRAINT deal_contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Indexes for deal_contacts
CREATE INDEX IF NOT EXISTS deal_contacts_deal_id_idx ON public.deal_contacts USING btree (deal_id);
CREATE INDEX IF NOT EXISTS deal_contacts_contact_id_idx ON public.deal_contacts USING btree (contact_id);

-- ============================================================================
-- Step 2: Create deal_properties junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deal_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  property_id UUID NOT NULL,
  role TEXT NULL, -- e.g., 'primary', 'alternative', 'comparable', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT deal_properties_pkey PRIMARY KEY (id),
  CONSTRAINT deal_properties_deal_id_property_id_key UNIQUE (deal_id, property_id),
  CONSTRAINT deal_properties_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
  CONSTRAINT deal_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Indexes for deal_properties
CREATE INDEX IF NOT EXISTS deal_properties_deal_id_idx ON public.deal_properties USING btree (deal_id);
CREATE INDEX IF NOT EXISTS deal_properties_property_id_idx ON public.deal_properties USING btree (property_id);

-- ============================================================================
-- Step 3: Migrate existing data from deals table
-- ============================================================================

-- Migrate existing contact_id relationships
INSERT INTO public.deal_contacts (deal_id, contact_id, role)
SELECT id, contact_id, 'primary'
FROM public.deals
WHERE contact_id IS NOT NULL
ON CONFLICT (deal_id, contact_id) DO NOTHING;

-- Migrate existing property_id relationships
INSERT INTO public.deal_properties (deal_id, property_id, role)
SELECT id, property_id, 'primary'
FROM public.deals
WHERE property_id IS NOT NULL
ON CONFLICT (deal_id, property_id) DO NOTHING;

-- ============================================================================
-- Step 4: Drop old foreign key columns from deals
-- ============================================================================

-- Drop foreign key constraints first
ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_contact_id_fkey;

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_property_id_fkey;

-- Drop the columns
ALTER TABLE public.deals
  DROP COLUMN IF EXISTS contact_id;

ALTER TABLE public.deals
  DROP COLUMN IF EXISTS property_id;

-- ============================================================================
-- Step 5: Add RLS policies (if needed)
-- ============================================================================

-- Enable RLS on junction tables
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_properties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deal_contacts
CREATE POLICY "Users can view their own deal_contacts"
  ON public.deal_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_contacts.deal_id
      AND deals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own deal_contacts"
  ON public.deal_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_contacts.deal_id
      AND deals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own deal_contacts"
  ON public.deal_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_contacts.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- Create RLS policies for deal_properties
CREATE POLICY "Users can view their own deal_properties"
  ON public.deal_properties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_properties.deal_id
      AND deals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own deal_properties"
  ON public.deal_properties
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_properties.deal_id
      AND deals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own deal_properties"
  ON public.deal_properties
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_properties.deal_id
      AND deals.user_id = auth.uid()
    )
  );
