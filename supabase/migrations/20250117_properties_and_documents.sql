-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  title text NOT NULL,
  description text,

  -- Address
  address text NOT NULL,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',

  -- Location (for future map integration)
  latitude numeric(10,8),
  longitude numeric(11,8),

  -- Property Details
  price numeric(12,2),
  bedrooms integer,
  bathrooms numeric(3,1), -- Allows half baths (2.5)
  square_feet integer,
  lot_size integer, -- Square feet
  year_built integer,

  -- Property Type & Status
  property_type text NOT NULL DEFAULT 'residential', -- residential, commercial, land
  status text NOT NULL DEFAULT 'available', -- available, pending, sold, rented

  -- Media
  images text[] DEFAULT '{}', -- Array of image URLs
  virtual_tour_url text,

  -- Listing Information
  listing_date date,

  -- Organization
  tags text[] DEFAULT '{}',

  -- Custom fields (flexible JSONB for future extensibility)
  custom_fields jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create documents table (shared between contacts, properties, deals, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document Information
  filename text NOT NULL,
  file_url text NOT NULL, -- Supabase Storage URL
  file_size integer, -- Bytes
  file_type text, -- MIME type (application/pdf, image/jpeg, etc.)

  -- Relationships (polymorphic - link to different entity types)
  entity_type text NOT NULL, -- 'contact', 'property', 'deal', etc.
  entity_id uuid NOT NULL, -- ID of the related entity

  -- Categorization
  category text, -- 'contract', 'id', 'inspection_report', 'photo', etc.
  tags text[] DEFAULT '{}',

  -- Metadata
  description text,
  uploaded_by uuid REFERENCES auth.users(id),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK constraint to contact_properties now that properties exists
ALTER TABLE contact_properties
  ADD CONSTRAINT contact_properties_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- Indexes for properties
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON properties(user_id);
CREATE INDEX IF NOT EXISTS properties_status_idx ON properties(status);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON properties(property_type);
CREATE INDEX IF NOT EXISTS properties_price_idx ON properties(price);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS properties_listing_date_idx ON properties(listing_date DESC);

-- Full-text search index for properties
CREATE INDEX IF NOT EXISTS properties_search_idx ON properties
  USING gin(to_tsvector('english',
    title || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(city, '')
  ));

-- Indexes for documents
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_entity_type_idx ON documents(entity_type);
CREATE INDEX IF NOT EXISTS documents_entity_id_idx ON documents(entity_id);
CREATE INDEX IF NOT EXISTS documents_entity_composite_idx ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);

-- Full-text search index for documents
CREATE INDEX IF NOT EXISTS documents_search_idx ON documents
  USING gin(to_tsvector('english',
    filename || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(category, '')
  ));

-- Function to update updated_at timestamp for properties
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for properties
CREATE TRIGGER properties_updated_at_trigger
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_properties_updated_at();

-- Function to update updated_at timestamp for documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at for documents
CREATE TRIGGER documents_updated_at_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Properties RLS Policies
CREATE POLICY "Users can view their own properties"
  ON properties
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own properties"
  ON properties
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
  ON properties
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
  ON properties
  FOR DELETE
  USING (auth.uid() = user_id);

-- Documents RLS Policies
CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents
  FOR DELETE
  USING (auth.uid() = user_id);
