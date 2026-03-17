-- Migration 022: onboarding completion tracking + profile display name
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_display_name TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_step      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Backfill: existing users with a profile are considered onboarded
UPDATE users
SET onboarding_completed = true
WHERE user_type IS NOT NULL OR profile_type IS NOT NULL;
