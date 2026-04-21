-- 064: TRAV-28 — Module Concours V2
-- Statut de participation + champs CSO/CCE/Dressage détaillés

BEGIN;

-- =========================================================================
-- 1. Statut de participation (TRAV-28-03)
-- =========================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS statut_participation text
    NOT NULL DEFAULT 'classe'
    CHECK (statut_participation IN ('classe', 'abandonne', 'elimine', 'hors_concours'));

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS motif_elimination text
    CHECK (motif_elimination IN ('refus_repetes', 'chute', 'hors_temps', 'autre'));

-- =========================================================================
-- 2. Détail CSO pur — barres et refus séparés (TRAV-28-04)
-- =========================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS cso_barres integer DEFAULT 0;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS cso_refus integer DEFAULT 0;

-- =========================================================================
-- 3. Détail CCE — barres et refus CSO séparés (TRAV-28-05)
-- =========================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS cce_cso_barres integer DEFAULT 0;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS cce_cso_refus integer DEFAULT 0;

-- =========================================================================
-- 4. Dressage pur — reprise et note % (TRAV-28-06)
-- =========================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS dressage_reprise text;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS dressage_note_pct numeric(5,2);

COMMIT;
