-- Add category column to contacts table
-- Migration: Add contact category field for buyer/seller/lender/tenant classification

-- Add category column (optional field)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS category text;

-- Add comment to document the allowed values
COMMENT ON COLUMN contacts.category IS 'Contact category: potential_buyer, potential_seller, signed_buyer, signed_seller, potential_lender, potential_tenant';

-- Create index for category filtering (performance optimization)
CREATE INDEX IF NOT EXISTS contacts_category_idx ON contacts(category);

-- Add check constraint to ensure only valid categories
ALTER TABLE contacts
ADD CONSTRAINT contacts_category_check
CHECK (category IS NULL OR category IN (
  'potential_buyer',
  'potential_seller',
  'signed_buyer',
  'signed_seller',
  'potential_lender',
  'potential_tenant'
));
