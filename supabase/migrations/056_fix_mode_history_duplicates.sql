-- Migration 056: supprimer les doublons dans horse_mode_history + contrainte d'unicité

-- 1. Supprimer les doublons (garder le plus ancien par horse_id + mode_from + mode_to + date)
DELETE FROM public.horse_mode_history
WHERE id NOT IN (
  SELECT DISTINCT ON (horse_id, mode_from, mode_to, date::date) id
  FROM public.horse_mode_history
  ORDER BY horse_id, mode_from, mode_to, date::date, changed_at ASC
);

-- 2. Ajouter une contrainte d'unicité sur (horse_id, mode_from, mode_to, date par jour)
-- Pour éviter les futurs doublons on crée un index unique sur la date tronquée au jour
CREATE UNIQUE INDEX IF NOT EXISTS horse_mode_history_unique_day
  ON public.horse_mode_history (horse_id, mode_from, mode_to, date_trunc('day', changed_at));
