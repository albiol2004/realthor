-- Add birth-related fields to contacts table for better AI matching of IDs/passports
-- These fields help AI identify contacts when documents contain birth information
-- (as is common in passports, national IDs, etc.)

-- Add date_of_birth field
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add place_of_birth field (format: "City, Country" e.g., "Valencia, Spain")
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS place_of_birth TEXT;

-- Add index for date queries (partial index for better performance)
CREATE INDEX IF NOT EXISTS contacts_date_of_birth_idx 
ON contacts(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN contacts.date_of_birth IS 'Contact date of birth - used for AI matching with IDs/passports';
COMMENT ON COLUMN contacts.place_of_birth IS 'Contact place of birth (City, Country format) - used for AI matching with IDs/passports';
