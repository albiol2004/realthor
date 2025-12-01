-- Add read/unread status to emails
ALTER TABLE kairo_emails ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Add index for efficient filtering of unread emails
CREATE INDEX IF NOT EXISTS emails_is_read_idx ON kairo_emails(user_id, is_read, sent_at DESC);

-- Add updated_at column for tracking when emails are marked as read
ALTER TABLE kairo_emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_kairo_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kairo_emails_updated_at
    BEFORE UPDATE ON kairo_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_kairo_emails_updated_at();

COMMENT ON COLUMN kairo_emails.is_read IS 'Whether the user has read this email';
