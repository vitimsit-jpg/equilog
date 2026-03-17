-- Migration 023: horse daily logs (logger état du cheval)
CREATE TABLE IF NOT EXISTS horse_daily_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  horse_id    UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  etat_general TEXT CHECK (etat_general IN ('excellent','bien','normal','tendu','fatigue','douloureux')),
  appetit      TEXT CHECK (appetit IN ('mange_bien','mange_peu','na_pas_mange')),
  observations TEXT[],
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (horse_id, date)
);

ALTER TABLE horse_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage logs for their horses"
  ON horse_daily_logs
  FOR ALL
  USING (
    horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid())
  );
