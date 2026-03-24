-- Migration 040: Module Nutrition

-- ── Activation flag ────────────────────────────────────────────────────────────
ALTER TABLE horses
  ADD COLUMN IF NOT EXISTS module_nutrition boolean DEFAULT false;

-- ── Ration active (one row per horse, upserted on each save) ───────────────────
CREATE TABLE IF NOT EXISTS horse_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- JSONB blobs for each section
  fibres    jsonb NOT NULL DEFAULT '[]',
  -- [{id, type: "foin"|"luzerne"|"melange", mode: "fixe"|"volonte", quantite_kg: number|null}]
  herbe     jsonb NOT NULL DEFAULT '{"actif": false, "heures": null}',
  -- {actif: bool, heures: "2"|"4"|"6"|"journee"|null}
  granules  jsonb NOT NULL DEFAULT '[]',
  -- [{id, nom, type: "standard"|"floconnes"|"extrudes"|"mash"|"autre", repas: [{horaire, quantite_l}]}]
  complements jsonb NOT NULL DEFAULT '[]',
  -- [{id, nom, forme, quantite, unite, frequence, cure_semaines, cure_debut}]
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(horse_id)
);

ALTER TABLE horse_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own horse nutrition"
  ON horse_nutrition FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()))
  WITH CHECK (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));

-- Gérant can read horses in same écurie (read-only for gérant dashboard)
CREATE POLICY "Anyone in ecurie can read nutrition"
  ON horse_nutrition FOR SELECT
  USING (true);

-- ── Modification history ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element   text NOT NULL,   -- "Granulés Pavo — Repas du soir"
  old_value text,            -- "1.5L"
  new_value text,            -- "2L"
  reason    text,
  snapshot  jsonb,           -- full ration snapshot before change
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own nutrition history"
  ON nutrition_history FOR ALL
  USING (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()))
  WITH CHECK (horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid()));
