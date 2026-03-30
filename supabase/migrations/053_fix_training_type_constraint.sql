-- Migration 053: Fix training_sessions type CHECK constraint
-- The constraint from migration 005 only included legacy types.
-- 'paddock', 'trotting', 'barres_sol', 'cavalettis', 'meca_obstacles',
-- 'obstacles_enchainement', 'cross_entrainement', 'longues_renes', 'stretching',
-- 'balade', 'concours' were never added, causing INSERT errors for these types.

ALTER TABLE public.training_sessions
  DROP CONSTRAINT IF EXISTS training_sessions_type_check;

-- No CHECK constraint — type is validated at the application layer (TypeScript TrainingType).
-- This avoids future breakage when new types are added.
