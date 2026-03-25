-- Migration 043: TRAV-17 Onglet Travail — Refonte complète
-- §5.1 — Renommage qui_monte → qui_sen_occupe (training_planned_sessions)
-- §5.2 — Ajout champs training_sessions

ALTER TABLE training_planned_sessions
  RENAME COLUMN qui_monte TO qui_sen_occupe;

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS mode_entree       TEXT CHECK (mode_entree IN ('planifie','logge')),
  ADD COLUMN IF NOT EXISTS est_complement    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS duree_planifiee   INTEGER,
  ADD COLUMN IF NOT EXISTS duree_reelle      INTEGER,
  ADD COLUMN IF NOT EXISTS note_vocale_brute TEXT;
