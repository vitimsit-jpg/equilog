-- 063: TRAV-26 Amendé — statut_planification sur training_planned_sessions
-- Approche A : on garde les 2 tables (training_sessions + training_planned_sessions)
-- Le statut est ajouté sur training_planned_sessions uniquement

BEGIN;

-- =========================================================================
-- 1. Ajout des colonnes sur training_planned_sessions
-- =========================================================================

-- statut_planification remplace la logique status + linked_session_id
-- planifiee = en attente (default)
-- realisee = linked_session_id IS NOT NULL (planned → done)
-- remplacee = une autre séance a été enregistrée à la place
-- annulee = séance annulée manuellement ou auto (J+7)
ALTER TABLE training_planned_sessions
  ADD COLUMN IF NOT EXISTS statut_planification text
    NOT NULL DEFAULT 'planifiee'
    CHECK (statut_planification IN ('planifiee', 'realisee', 'remplacee', 'annulee'));

-- FK vers la séance qui remplace (pour statut "remplacee")
ALTER TABLE training_planned_sessions
  ADD COLUMN IF NOT EXISTS replaced_by_session_id uuid
    REFERENCES training_sessions(id) ON DELETE SET NULL;

-- Soft-delete pour le toast undo 5s
ALTER TABLE training_planned_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Traçabilité auto-annulation J+7
ALTER TABLE training_planned_sessions
  ADD COLUMN IF NOT EXISTS annulee_auto_at timestamptz;

-- Traçabilité notification J-1 (évite les doublons de notif)
ALTER TABLE training_planned_sessions
  ADD COLUMN IF NOT EXISTS notif_j_minus_1_sent_at timestamptz;

-- Soft-delete sur training_sessions aussi (pour bouton ✗ sur séances enregistrées)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- =========================================================================
-- 2. Backfill idempotent depuis l'état existant
-- =========================================================================

-- Planned sessions qui ont été validées (linked_session_id renseigné) → realisee
UPDATE training_planned_sessions
SET statut_planification = 'realisee'
WHERE linked_session_id IS NOT NULL
  AND statut_planification = 'planifiee';

-- Planned sessions qui ont été skipped → annulee
UPDATE training_planned_sessions
SET statut_planification = 'annulee'
WHERE status = 'skipped'
  AND statut_planification = 'planifiee';

-- =========================================================================
-- 3. Index pour les requêtes fréquentes
-- =========================================================================

-- Index pour filtrer les planned non-traitées rapidement (strip, vue jour)
CREATE INDEX IF NOT EXISTS idx_planned_sessions_statut
  ON training_planned_sessions(statut_planification)
  WHERE deleted_at IS NULL;

-- Index composite horse + date pour la vue jour
CREATE INDEX IF NOT EXISTS idx_planned_sessions_horse_date_visible
  ON training_planned_sessions(horse_id, date)
  WHERE deleted_at IS NULL;

-- Index pour le soft-delete sur training_sessions
CREATE INDEX IF NOT EXISTS idx_training_sessions_visible
  ON training_sessions(horse_id, date)
  WHERE deleted_at IS NULL;

-- =========================================================================
-- 4. Contrainte de cohérence
-- =========================================================================

-- INV-1 : si realisee alors linked_session_id IS NOT NULL
-- INV-3 : si remplacee alors replaced_by_session_id IS NOT NULL
ALTER TABLE training_planned_sessions
  DROP CONSTRAINT IF EXISTS chk_statut_planification_coherence;

ALTER TABLE training_planned_sessions
  ADD CONSTRAINT chk_statut_planification_coherence
  CHECK (
    (statut_planification = 'realisee' AND linked_session_id IS NOT NULL)
    OR (statut_planification = 'remplacee' AND replaced_by_session_id IS NOT NULL)
    OR statut_planification IN ('planifiee', 'annulee')
  );

-- INV-2 : unicité d'un type planifié non traité par jour par cheval
CREATE UNIQUE INDEX IF NOT EXISTS uq_planned_one_per_day_type
  ON training_planned_sessions(horse_id, date, type)
  WHERE statut_planification = 'planifiee' AND deleted_at IS NULL;

COMMIT;
