-- 062: Notifications in-app — historique des notifications utilisateur

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'health_reminder',
    'training_reminder',
    'rehab_complete',
    'weekly_summary',
    'score_alert',
    'coach_modification',
    'horse_share',
    'other'
  )),
  title text NOT NULL,
  body text,
  url text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read = false;

CREATE INDEX idx_notifications_user_recent
  ON notifications(user_id, created_at DESC);
