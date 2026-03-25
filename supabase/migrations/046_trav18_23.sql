-- ═══════════════════════════════════════════════════════════════════
-- TRAV-18 : Socle UI — métadonnées mode de vie
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE horses ADD COLUMN IF NOT EXISTS horse_mode_since  timestamptz;
ALTER TABLE horses ADD COLUMN IF NOT EXISTS horse_mode_reason text;
ALTER TABLE horses ADD COLUMN IF NOT EXISTS date_retraite     date;
ALTER TABLE horses ADD COLUMN IF NOT EXISTS carriere_archive  jsonb;

-- Pour les poulains : lien mère / poulain
ALTER TABLE horses ADD COLUMN IF NOT EXISTS mere_horse_id    uuid REFERENCES horses(id) ON DELETE SET NULL;
ALTER TABLE horses ADD COLUMN IF NOT EXISTS poulain_horse_id uuid REFERENCES horses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_horses_index_mode ON horses(horse_index_mode);

-- ═══════════════════════════════════════════════════════════════════
-- TRAV-19 : Profil Gardien non-cavalier
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS horse_user_roles (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id   uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'owner',  -- 'owner' | 'guardian' | 'caretaker'
  rides_horse boolean    NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(horse_id, user_id)
);

ALTER TABLE horse_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horse_user_roles_owner" ON horse_user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = horse_user_roles.horse_id
        AND horses.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- TRAV-20 : Profil ICr — Croissance / Éducation poulain
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS horse_growth_milestones (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id       uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type text        NOT NULL,
  -- 'sevrage' | 'debut_debourrage' | 'premiere_monte' | 'premier_concours'
  -- | 'vaccination_complete' | 'vermifugation' | 'identification' | 'autre'
  label          text,
  date           date        NOT NULL,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE horse_growth_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_growth_milestones_owner" ON horse_growth_milestones
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS horse_growth_measures (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id         uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             date        NOT NULL,
  taille_cm        numeric(5,1),
  poids_kg         numeric(6,1),
  tour_poitrine_cm numeric(5,1),
  notes            text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE horse_growth_measures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_growth_measures_owner" ON horse_growth_measures
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- TRAV-21 : Profil IS — Retraite / Médicaments / Mouvement
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS horse_medications (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id         uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom              text        NOT NULL,
  forme            text,  -- 'oral' | 'injectable' | 'topique' | 'autre'
  dose             text,
  frequence        text,  -- 'quotidien' | 'matin_soir' | 'hebdomadaire' | 'si_besoin' | 'cure'
  date_debut       date,
  date_fin         date,
  vet_prescripteur text,
  notes            text,
  actif            boolean     NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE horse_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_medications_owner" ON horse_medications
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS horse_bcs_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id   uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date        NOT NULL,
  score      numeric(3,1) NOT NULL,  -- Échelle Henneke 1–9
  notes      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE horse_bcs_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_bcs_logs_owner" ON horse_bcs_logs
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS horse_movement_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id     uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date        NOT NULL,
  type         text        NOT NULL,
  -- 'paddock_libre' | 'pre_libre' | 'balade_main' | 'longe_douce' | 'monte_douce' | 'autre'
  duration_min integer,
  observation  text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE horse_movement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_movement_logs_owner" ON horse_movement_logs
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- TRAV-22 : Profil IR — Convalescence / Praticiens / Examens
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS horse_practitioners (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id   uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  -- 'vet' | 'osteo' | 'physio' | 'kine' | 'marechal' | 'dentiste' | 'autre'
  nom        text        NOT NULL,
  telephone  text,
  email      text,
  notes      text,
  principal  boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE horse_practitioners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_practitioners_owner" ON horse_practitioners
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS horse_medical_exams (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id    uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  type        text        NOT NULL,
  -- 'radio' | 'echo' | 'endoscopie' | 'bilan_sanguin' | 'scintigraphie' | 'irm' | 'autre'
  description text,
  vet_name    text,
  results     text,
  media_urls  text[]      DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE horse_medical_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_medical_exams_owner" ON horse_medical_exams
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- TRAV-23 : Historique des transitions de mode de vie
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS horse_mode_history (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id   uuid        NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode_from  text,
  mode_to    text        NOT NULL,
  reason     text,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE horse_mode_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_mode_history_owner" ON horse_mode_history
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_horse_mode_history_horse
  ON horse_mode_history(horse_id, changed_at DESC);
