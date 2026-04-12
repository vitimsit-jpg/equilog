-- 059: index de performance — requêtes crons et horse-index

-- push_subscriptions : batch fetch par user_id dans tous les crons
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

-- horse_scores : calcul percentile par région dans horse-index/route.ts
CREATE INDEX IF NOT EXISTS idx_horse_scores_region
  ON horse_scores(region, computed_at DESC)
  WHERE region IS NOT NULL;

-- training_planned_sessions : cron training-reminder filtre par (date, status)
-- sans horse_id, l'index existant (horse_id, date) n'aide pas
CREATE INDEX IF NOT EXISTS idx_training_planned_sessions_date_status
  ON training_planned_sessions(date, status)
  WHERE status = 'planned';

-- rehab_protocols : cron daily filtre par status = 'active'
CREATE INDEX IF NOT EXISTS idx_rehab_protocols_status
  ON rehab_protocols(status)
  WHERE status = 'active';

-- budget_entries : cron daily filtre les templates récurrents
CREATE INDEX IF NOT EXISTS idx_budget_entries_recurring_template
  ON budget_entries(is_recurring, recurring_template_id)
  WHERE is_recurring = true;

-- Indexes composites (horse_id, date DESC) pour les requêtes ordonnées par date
-- health_records : eq(horse_id).order(date) dans pdf + ai-insights + pages cheval
-- L'index simple horse_id existant ne couvre pas le ORDER BY date
CREATE INDEX IF NOT EXISTS idx_health_records_horse_date
  ON health_records(horse_id, date DESC);

-- competitions : eq(horse_id).order(date) dans pdf + ai-insights + classements
CREATE INDEX IF NOT EXISTS idx_competitions_horse_date
  ON competitions(horse_id, date DESC);

-- budget_entries : eq(horse_id).order(date) dans pdf + page budget
CREATE INDEX IF NOT EXISTS idx_budget_entries_horse_date
  ON budget_entries(horse_id, date DESC);
