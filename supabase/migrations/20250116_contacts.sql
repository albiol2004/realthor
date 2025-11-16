-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  profile_picture_url text,

  -- Professional Information
  company text,
  job_title text,

  -- Address
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  address_country text DEFAULT 'US',

  -- CRM Fields
  status text NOT NULL DEFAULT 'lead', -- lead, client, past_client
  source text, -- referral, website, social_media, cold_call, other
  tags text[] DEFAULT '{}',

  -- Real Estate Specific
  budget_min numeric(12,2),
  budget_max numeric(12,2),

  -- Notes
  notes text,

  -- Custom fields (flexible JSONB for future extensibility)
  custom_fields jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contact_properties junction table (many-to-many with roles)
-- Note: This table will remain unused until the properties feature is implemented
-- The foreign key constraint to properties table will be added later
CREATE TABLE IF NOT EXISTS contact_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL, -- Will add FK constraint when properties table exists
  role text NOT NULL, -- owner, buyer, seller, tenant
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure unique contact-property-role combination
  UNIQUE(contact_id, property_id, role)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts(phone);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts(status);
CREATE INDEX IF NOT EXISTS contacts_created_at_idx ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_updated_at_idx ON contacts(updated_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS contacts_search_idx ON contacts
  USING gin(to_tsvector('english',
    first_name || ' ' ||
    last_name || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(company, '')
  ));

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS contact_properties_contact_id_idx ON contact_properties(contact_id);
CREATE INDEX IF NOT EXISTS contact_properties_property_id_idx ON contact_properties(property_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER contacts_updated_at_trigger
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_properties ENABLE ROW LEVEL SECURITY;

-- Agents can view their own contacts
CREATE POLICY "Agents can view their own contacts"
  ON contacts
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Agents can insert their own contacts
CREATE POLICY "Agents can create their own contacts"
  ON contacts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Agents can update their own contacts
CREATE POLICY "Agents can update their own contacts"
  ON contacts
  FOR UPDATE
  USING (
    auth.uid() = user_id
  );

-- Agents can delete their own contacts
CREATE POLICY "Agents can delete their own contacts"
  ON contacts
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Company admins can view all contacts from their company's agents
CREATE POLICY "Company admins can view company contacts"
  ON contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a1
      JOIN agents a2 ON a1.company_id = a2.company_id
      WHERE a1.user_id = auth.uid()
        AND a2.user_id = contacts.user_id
        AND a1.company_id IS NOT NULL
    )
  );

-- RLS for contact_properties junction table
CREATE POLICY "Users can view their contact-property relationships"
  ON contact_properties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_properties.contact_id
        AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their contact-property relationships"
  ON contact_properties
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_properties.contact_id
        AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their contact-property relationships"
  ON contact_properties
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_properties.contact_id
        AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their contact-property relationships"
  ON contact_properties
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_properties.contact_id
        AND contacts.user_id = auth.uid()
    )
  );
