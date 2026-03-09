-- Add new columns to health_records
ALTER TABLE health_records
  ADD COLUMN IF NOT EXISTS practitioner_phone text,
  ADD COLUMN IF NOT EXISTS practitioner_email text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS urgency text CHECK (urgency IN ('normal', 'urgent', 'critique'));

-- Update CHECK constraint on type to include new values
-- Drop old constraint and add new one
ALTER TABLE health_records
  DROP CONSTRAINT IF EXISTS health_records_type_check;

ALTER TABLE health_records
  ADD CONSTRAINT health_records_type_check
  CHECK (type IN ('vaccin', 'vermifuge', 'dentiste', 'osteo', 'ferrage', 'veterinaire', 'masseuse', 'autre'));
