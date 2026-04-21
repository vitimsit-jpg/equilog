-- 065: TRAV-28-15 — Liaison budget concours
-- Ajoute linked_competition_id sur budget_entries pour le lien retour

ALTER TABLE budget_entries
  ADD COLUMN IF NOT EXISTS linked_competition_id uuid
    REFERENCES competitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_budget_entries_competition
  ON budget_entries(linked_competition_id)
  WHERE linked_competition_id IS NOT NULL;
