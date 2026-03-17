-- Migration 019 : Profil météo par cheval (METEO-01)
ALTER TABLE horses
  ADD COLUMN IF NOT EXISTS tonte TEXT CHECK (tonte IN ('non_tondu', 'partielle', 'complete')),
  ADD COLUMN IF NOT EXISTS morphologie_meteo TEXT CHECK (morphologie_meteo IN ('sang_chaud', 'pur_sang', 'rustique')),
  ADD COLUMN IF NOT EXISTS etat_corporel TEXT CHECK (etat_corporel IN ('normal', 'maigre')),
  ADD COLUMN IF NOT EXISTS trousseau JSONB DEFAULT '[]'::jsonb;
