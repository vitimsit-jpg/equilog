-- Migration 010 — Add SIRE and FEI registration numbers to horses

ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS sire_number TEXT,
  ADD COLUMN IF NOT EXISTS fei_number TEXT;
