-- Migration 050: Journal d'évolution IR (TRAV P1)
-- Suivi quotidien de la rééducation : douleur, mobilité, observation

CREATE TABLE IF NOT EXISTS horse_recovery_journal (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id     uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date        NOT NULL DEFAULT CURRENT_DATE,
  observation  text,
  pain_level   smallint    CHECK (pain_level BETWEEN 1 AND 5),
  mobility_level smallint  CHECK (mobility_level BETWEEN 1 AND 5),
  vet_validated boolean    NOT NULL DEFAULT false,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE horse_recovery_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner access" ON horse_recovery_journal FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));
