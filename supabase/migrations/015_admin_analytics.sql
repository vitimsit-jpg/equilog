-- ─────────────────────────────────────────────────────────────
-- 015 — Admin infrastructure + analytics
-- ─────────────────────────────────────────────────────────────

-- Admin flag + account lifecycle on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin         BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status           TEXT        NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at     TIMESTAMPTZ;

-- ── Event logs (internal product analytics) ──────────────────
CREATE TABLE IF NOT EXISTS event_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name     TEXT        NOT NULL,
  event_category TEXT        NOT NULL,
  properties     JSONB       NOT NULL DEFAULT '{}',
  page_path      TEXT,
  session_id     TEXT,
  ip_hash        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events" ON event_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- Service role used for admin reads — no SELECT policy needed

CREATE INDEX IF NOT EXISTS idx_event_logs_user_id  ON event_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_name     ON event_logs(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_created  ON event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_category ON event_logs(event_category, created_at DESC);

-- ── Audit logs (admin actions) ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  resource_type TEXT        NOT NULL,
  resource_id   TEXT,
  details       JSONB       NOT NULL DEFAULT '{}',
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin    ON audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ── Consent logs (RGPD) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT        NOT NULL,
  accepted     BOOLEAN     NOT NULL,
  version      TEXT        NOT NULL DEFAULT '1.0',
  accepted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash      TEXT,
  user_agent   TEXT
);

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own consents"   ON consent_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own consents" ON consent_logs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_consent_logs_user ON consent_logs(user_id, consent_type, accepted_at DESC);

-- ── Performance indexes for admin queries ─────────────────────
CREATE INDEX IF NOT EXISTS idx_users_created_at  ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_plan        ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_user_type   ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);
CREATE INDEX IF NOT EXISTS idx_horses_ecurie     ON horses(ecurie) WHERE ecurie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horses_discipline ON horses(discipline) WHERE discipline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horses_created    ON horses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_date     ON training_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_date       ON health_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_competition_date  ON competitions(date DESC);

-- ── RPC: daily signup counts (last 30 days) ───────────────────
CREATE OR REPLACE FUNCTION get_daily_signups(days_back INT DEFAULT 30)
RETURNS TABLE(signup_date DATE, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DATE(created_at) AS signup_date, COUNT(*) AS count
  FROM users
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY signup_date;
$$;

-- ── RPC: active users (have created activity in last N days) ──
CREATE OR REPLACE FUNCTION get_active_users_count(days_back INT DEFAULT 7)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(DISTINCT h.user_id)
  FROM training_sessions ts
  JOIN horses h ON h.id = ts.horse_id
  WHERE ts.created_at >= NOW() - (days_back || ' days')::INTERVAL;
$$;

-- ── RPC: per-user summary for admin table ────────────────────
CREATE OR REPLACE FUNCTION get_user_summary(target_user_id UUID)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'horse_count',   (SELECT COUNT(*) FROM horses WHERE user_id = target_user_id),
    'session_count', (SELECT COUNT(*) FROM training_sessions ts JOIN horses h ON h.id = ts.horse_id WHERE h.user_id = target_user_id),
    'health_count',  (SELECT COUNT(*) FROM health_records hr JOIN horses h ON h.id = hr.horse_id WHERE h.user_id = target_user_id),
    'last_session',  (SELECT MAX(ts.created_at) FROM training_sessions ts JOIN horses h ON h.id = ts.horse_id WHERE h.user_id = target_user_id)
  );
$$;
