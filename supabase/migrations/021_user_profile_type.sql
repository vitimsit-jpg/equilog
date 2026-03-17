-- Migration 021: Add profile_type + modules to users
-- Replaces the old 6-type user_type system with 4 profiles + 2 extension modules

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_type  TEXT    DEFAULT 'loisir',
  ADD COLUMN IF NOT EXISTS module_coach  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS module_gerant BOOLEAN DEFAULT false;

-- Backfill from existing user_type values
UPDATE users
SET
  profile_type = CASE
    WHEN user_type = 'competition'                      THEN 'competition'
    WHEN user_type = 'pro'                              THEN 'pro'
    WHEN user_type IN ('gerant_cavalier','gerant_ecurie') THEN 'gerant'
    ELSE 'loisir'
  END,
  module_coach  = (user_type = 'coach'),
  module_gerant = (user_type IN ('gerant_cavalier','gerant_ecurie'))
WHERE user_type IS NOT NULL;
