-- 066: Audit sécurité — RLS audit_logs + index soft-delete training_sessions

-- =========================================================================
-- 1. RLS sur audit_logs (CRIT-3)
-- =========================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "admins_insert_audit_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- =========================================================================
-- 2. Index pour queries soft-delete training_sessions (HIGH-5)
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_training_sessions_horse_active_date
  ON training_sessions (horse_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planned_sessions_horse_active_date
  ON training_planned_sessions (horse_id, date DESC)
  WHERE deleted_at IS NULL;
