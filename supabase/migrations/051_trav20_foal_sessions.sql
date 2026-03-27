-- Migration 051: TRAV-20 — Champs séances ICr (poulain)
-- session_type : type d'activité éducative (manipulation, longe, débourrage…)
-- foal_reaction : comportement du poulain lors de la séance

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS session_type   TEXT,
  -- 'manipulation' | 'toilettage' | 'longe_douce' | 'debourrage' | 'premiere_monte' | 'autre'
  ADD COLUMN IF NOT EXISTS foal_reaction  TEXT;
  -- 'calme' | 'attentif' | 'nerveux' | 'agite' | 'difficile'
