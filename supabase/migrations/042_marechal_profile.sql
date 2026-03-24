-- Migration 042: TRAV-16 Module Maréchal & Parage
-- Profil maréchalerie par cheval + colonnes enrichies sur health_records

-- ── Profil maréchalerie (configuration habituelle par cheval) ─────────────────
CREATE TABLE IF NOT EXISTS horse_marechal_profile (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id            UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id),

  type_intervention   TEXT CHECK (type_intervention IN (
                        'parage','ferrure','ferrure_ortho','urgence','deferrage','autre')),
  repartition_fers    TEXT CHECK (repartition_fers IN ('anterieurs','posterieurs','4_fers')),
  matiere_fer         TEXT CHECK (matiere_fer IN ('acier','aluminium','duplo','colle','autre')),
  options_avancees    JSONB DEFAULT '{}',
  -- ex: {"mortaises":true,"plaques":false,"rolling":false,"eponges":false,"extensions":false,"egg_bar":false,"autre":""}

  nom_marechal        TEXT,
  tel_marechal        TEXT,
  cout_habituel       NUMERIC(8,2),
  recurrence_semaines INTEGER,  -- null = Aucune
  notes_profil        TEXT,

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE(horse_id)  -- un seul profil par cheval
);

ALTER TABLE horse_marechal_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own marechal profile"
  ON horse_marechal_profile FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Enrichissement de health_records pour les logs maréchal ──────────────────
ALTER TABLE health_records
  ADD COLUMN IF NOT EXISTS type_intervention   TEXT,
  ADD COLUMN IF NOT EXISTS sous_type_urgence   TEXT,
  ADD COLUMN IF NOT EXISTS repartition_fers    TEXT,
  ADD COLUMN IF NOT EXISTS matiere_fer         TEXT,
  ADD COLUMN IF NOT EXISTS options_avancees    JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_semaines INTEGER;
-- next_date (déjà existant) = date + recurrence_semaines * 7 jours
