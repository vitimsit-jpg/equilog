-- Migration 038: linked_competition_id on training_sessions
-- Links a training session of type=concours to a competition record

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS linked_competition_id uuid REFERENCES competitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_sessions_linked_competition
  ON training_sessions(linked_competition_id)
  WHERE linked_competition_id IS NOT NULL;
