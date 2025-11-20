-- ============================================================================
-- Utilities
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- Deals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- Deal Information
  title TEXT NOT NULL,
  value NUMERIC(12, 2), -- Deal value (optional)
  stage TEXT NOT NULL DEFAULT 'lead',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),

  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX deals_user_id_idx ON deals(user_id);
CREATE INDEX deals_contact_id_idx ON deals(contact_id);
CREATE INDEX deals_property_id_idx ON deals(property_id);
CREATE INDEX deals_stage_idx ON deals(stage, user_id);
CREATE INDEX deals_expected_close_date_idx ON deals(expected_close_date);
CREATE INDEX deals_created_at_idx ON deals(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Users can view their own deals
CREATE POLICY "Users can view own deals"
  ON deals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own deals
CREATE POLICY "Users can create own deals"
  ON deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own deals
CREATE POLICY "Users can update own deals"
  ON deals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own deals
CREATE POLICY "Users can delete own deals"
  ON deals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
