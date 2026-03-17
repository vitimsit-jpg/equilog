-- Migration 025: Généalogie du cheval
CREATE TABLE IF NOT EXISTS horse_pedigree (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  horse_id        UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE UNIQUE,
  -- Parents directs
  pere_name       TEXT,
  pere_sire       TEXT,
  pere_breed      TEXT,
  mere_name       TEXT,
  mere_sire       TEXT,
  mere_breed      TEXT,
  -- Grands-parents paternels
  gp_pat_pere_name  TEXT,
  gp_pat_pere_sire  TEXT,
  gp_pat_mere_name  TEXT,
  gp_pat_mere_sire  TEXT,
  -- Grands-parents maternels
  gp_mat_pere_name  TEXT,
  gp_mat_pere_sire  TEXT,
  gp_mat_mere_name  TEXT,
  gp_mat_mere_sire  TEXT,
  -- Arrière-grands-parents (noms uniquement)
  agp_pp_pere_name  TEXT,
  agp_pp_mere_name  TEXT,
  agp_pm_pere_name  TEXT,
  agp_pm_mere_name  TEXT,
  agp_mp_pere_name  TEXT,
  agp_mp_mere_name  TEXT,
  agp_mm_pere_name  TEXT,
  agp_mm_mere_name  TEXT,
  -- Métadonnées
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE horse_pedigree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage pedigree for their horses"
  ON horse_pedigree FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));

-- Relations cheval-cheval (fratrie, demi-frères, etc.)
CREATE TABLE IF NOT EXISTS horse_relations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  horse_id        UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  related_horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  relation_type   TEXT NOT NULL CHECK (relation_type IN ('frere','demi_frere','mere','pere','oncle','cousin')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (horse_id, related_horse_id)
);

ALTER TABLE horse_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage relations for their horses"
  ON horse_relations FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));
