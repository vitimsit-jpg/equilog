-- Migration 049: ajouter les soins thérapeutiques IS/IR dans la contrainte health_records
-- TRAV P1 — 14 soins IS + 4 soins IR supplémentaires

ALTER TABLE health_records
  DROP CONSTRAINT IF EXISTS health_records_type_check;

ALTER TABLE health_records
  ADD CONSTRAINT health_records_type_check
  CHECK (type IN (
    -- Soins standards
    'vaccin', 'vermifuge', 'dentiste', 'osteo', 'ferrage', 'veterinaire', 'masseuse', 'autre',
    -- Soins thérapeutiques IS (retraite / bien-être)
    'acupuncture',
    'physio_laser',
    'physio_ultrasons',
    'physio_tens',
    'pemf',
    'infrarouge',
    'cryotherapie',
    'thermotherapie',
    'pressotherapie',
    'ems',
    'bandes_repos',
    'etirements_passifs',
    'infiltrations',
    'mesotherapie',
    -- Soins thérapeutiques IR (convalescence) supplémentaires
    'balneotherapie',
    'water_treadmill',
    'tapis_marcheur',
    'ondes_choc'
  ));
