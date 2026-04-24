-- 067: Bug #6 Agathe — Liaison soins ↔ budget_entries
-- Permet d'associer une ligne budget à un soin pour upsert et cascade delete

ALTER TABLE budget_entries
  ADD COLUMN IF NOT EXISTS linked_health_record_id uuid
    REFERENCES health_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_budget_entries_health
  ON budget_entries(linked_health_record_id)
  WHERE linked_health_record_id IS NOT NULL;
