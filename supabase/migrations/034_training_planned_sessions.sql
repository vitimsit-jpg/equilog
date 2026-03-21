-- TRAV-00: training_planned_sessions — programme prévu / réalisé
CREATE TABLE IF NOT EXISTS training_planned_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'dressage',
  duration_min_target INT DEFAULT 45,
  intensity_target INT CHECK (intensity_target BETWEEN 1 AND 5),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'skipped')),
  linked_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_planned_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage planned sessions"
  ON training_planned_sessions
  FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()))
  WITH CHECK (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));

-- Index for queries by horse + date range
CREATE INDEX IF NOT EXISTS training_planned_sessions_horse_date
  ON training_planned_sessions (horse_id, date);
