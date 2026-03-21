-- TRAV-02: champ rider sur training_sessions (qui monte)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS rider TEXT
  CHECK (rider IN ('owner', 'owner_with_coach', 'coach', 'longe', 'travail_a_pied'));
