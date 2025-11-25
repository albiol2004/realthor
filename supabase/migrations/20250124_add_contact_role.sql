-- Add role column to contacts table
-- Role determines which compliance documents are required

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('buyer', 'seller', 'lender', 'tenant', 'landlord', 'other'));

-- Create index for faster filtering by role
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);

-- Add comment
COMMENT ON COLUMN contacts.role IS 'Contact role in transactions (buyer, seller, lender, tenant, landlord, other) - determines compliance requirements';
