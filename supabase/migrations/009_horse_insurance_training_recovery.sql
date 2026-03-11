-- Migration 009 — Add assurance to horses, equipement_recuperation to training_sessions

ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS assurance TEXT;

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS equipement_recuperation TEXT;
