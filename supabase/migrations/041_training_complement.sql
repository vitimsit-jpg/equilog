-- Migration 041: colonne complement sur training_sessions
-- Stocke les activités complémentaires (marcheur, paddock) liées à une séance

ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS complement TEXT[] DEFAULT NULL;
