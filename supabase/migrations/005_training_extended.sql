-- Migration 005 — Extend training_sessions with objectif, lieu + marcheur type

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS objectif TEXT,
  ADD COLUMN IF NOT EXISTS lieu TEXT;

-- Allow 'marcheur' as a training type (drop and recreate constraint if it exists)
ALTER TABLE public.training_sessions
  DROP CONSTRAINT IF EXISTS training_sessions_type_check;

ALTER TABLE public.training_sessions
  ADD CONSTRAINT training_sessions_type_check
  CHECK (type IN ('dressage', 'saut', 'endurance', 'cso', 'cross', 'travail_a_pied', 'longe', 'galop', 'plat', 'marcheur', 'autre'));
