-- Migration 006 — Extend horse profile (sexe, conditions_vie, objectif_saison, niveau)

ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS sexe TEXT CHECK (sexe IN ('hongre', 'jument', 'etalon')),
  ADD COLUMN IF NOT EXISTS conditions_vie TEXT CHECK (conditions_vie IN ('box', 'paddock', 'pre', 'box_paddock')),
  ADD COLUMN IF NOT EXISTS objectif_saison TEXT,
  ADD COLUMN IF NOT EXISTS niveau TEXT;
