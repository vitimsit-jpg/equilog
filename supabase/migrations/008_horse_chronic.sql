-- Migration 008 — Add maladies_chroniques to horses

ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS maladies_chroniques TEXT;
