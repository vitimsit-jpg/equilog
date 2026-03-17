-- Migration 024: Historique médical antérieur du cheval
CREATE TABLE IF NOT EXISTS horse_history_events (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  horse_id      UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN (
    'boiterie','ulcere','colique','operation','vaccination',
    'bilan_sanguin','soins_dentaires','osteo','radio',
    'physio','traitement_long_terme','autre'
  )),
  title         TEXT,
  description   TEXT,
  date_precision TEXT NOT NULL DEFAULT 'exact' CHECK (date_precision IN ('exact','mois','annee','inconnue')),
  event_date    DATE,
  event_month   INTEGER CHECK (event_month BETWEEN 1 AND 12),
  event_year    INTEGER CHECK (event_year > 1900 AND event_year <= 2100),
  vet_name      TEXT,
  clinic        TEXT,
  outcome       TEXT CHECK (outcome IN ('gueri','chronique','suivi','inconnu')),
  severity      TEXT CHECK (severity IN ('leger','modere','severe')),
  document_url  TEXT,
  extracted_by_ai BOOLEAN DEFAULT FALSE,
  ai_confidence JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE horse_history_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage history events for their horses"
  ON horse_history_events FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));

CREATE INDEX idx_horse_history_events_horse_id ON horse_history_events(horse_id);
CREATE INDEX idx_horse_history_events_date ON horse_history_events(event_year DESC, event_month DESC, event_date DESC);
