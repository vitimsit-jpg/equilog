-- RGPD Spec V2 — champs consentement et confidentialité

-- Consentement CGU à l'inscription
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_terms_version TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS anonymous_stats_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feed_visibility TEXT DEFAULT 'all' CHECK (feed_visibility IN ('all', 'activity', 'private')),
  ADD COLUMN IF NOT EXISTS gps_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Visibilité par cheval
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='horses' AND column_name='visibility') THEN
    ALTER TABLE horses ADD COLUMN visibility TEXT DEFAULT 'national' CHECK (visibility IN ('national', 'stable', 'private'));
  END IF;
END $$;
