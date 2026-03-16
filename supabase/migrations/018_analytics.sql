-- ============================================================
-- 018_analytics.sql — Analytics enrichment
-- ============================================================

-- Enrich event_logs with device context
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS referrer text;

-- Index for performance
CREATE INDEX IF NOT EXISTS event_logs_created_at_idx ON event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS event_logs_session_id_idx ON event_logs (session_id);
CREATE INDEX IF NOT EXISTS event_logs_page_path_idx ON event_logs (page_path);

-- ── Funnel stats ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_funnel_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_users',    (SELECT count(*) FROM users),
    'with_user_type', (SELECT count(*) FROM users WHERE user_type IS NOT NULL),
    'with_horse',     (SELECT count(DISTINCT user_id) FROM horses),
    'with_training',  (SELECT count(DISTINCT h.user_id)
                       FROM training_sessions ts
                       JOIN horses h ON ts.horse_id = h.id),
    'with_health',    (SELECT count(DISTINCT h.user_id)
                       FROM health_records hr
                       JOIN horses h ON hr.horse_id = h.id),
    'retained_7d',    (SELECT count(*) FROM users
                       WHERE last_seen_at >= now() - interval '7 days'
                         AND created_at < now() - interval '14 days')
  ) INTO result;
  RETURN result;
END;
$$;

-- ── Events per day ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_events_per_day(days_back int DEFAULT 30)
RETURNS TABLE(event_date date, event_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT created_at::date AS event_date, count(*) AS event_count
  FROM event_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY created_at::date
  ORDER BY created_at::date;
END;
$$;

-- ── Top pages ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_top_pages(limit_n int DEFAULT 10)
RETURNS TABLE(page text, visit_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT page_path AS page, count(*) AS visit_count
  FROM event_logs
  WHERE page_path IS NOT NULL AND page_path != ''
  GROUP BY page_path
  ORDER BY visit_count DESC
  LIMIT limit_n;
END;
$$;

-- ── Sessions count ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_sessions_count(days_back int DEFAULT 7)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT count(DISTINCT session_id)
    FROM event_logs
    WHERE created_at >= now() - (days_back || ' days')::interval
      AND session_id IS NOT NULL AND session_id != ''
  );
END;
$$;
