-- Migration 007 — Add coach_present to training_sessions

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS coach_present BOOLEAN DEFAULT false;
