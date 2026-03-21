-- 036: protocole de rééducation généré par IA
CREATE TABLE IF NOT EXISTS rehab_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  injury_description TEXT NOT NULL,
  phases JSONB NOT NULL DEFAULT '[]',
  current_phase_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  vet_validated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rehab_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON rehab_protocols
  FOR ALL USING (user_id = auth.uid());
