-- Migration 039: Gamification (Streaks, Badges, Challenges, User Follows)

-- ── Horse Streaks ─────────────────────────────────────────────────────────────
-- Stores the computed streak state per horse (upserted by API)
CREATE TABLE IF NOT EXISTS horse_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_active_week text,           -- ISO week e.g. "2025-W12"
  streak_frozen_until text,        -- ISO week until which streak is frozen
  last_freeze_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(horse_id)
);

-- Target sessions/week per horse (overrides default derived from horse_index_mode)
ALTER TABLE horses
  ADD COLUMN IF NOT EXISTS streak_target integer DEFAULT NULL;

-- RLS
ALTER TABLE horse_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own horse streaks"
  ON horse_streaks FOR ALL
  USING (
    horse_id IN (SELECT id FROM horses WHERE user_id = auth.uid())
  );

-- ── Horse Badges ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horse_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,         -- e.g. "streak_4", "sessions_50", "first_competition"
  earned_at timestamptz DEFAULT now(),
  UNIQUE(horse_id, badge_key)
);

ALTER TABLE horse_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own horse badges"
  ON horse_badges FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own horse badges"
  ON horse_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── Challenges ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('volume','regularite','discipline','collectif')),
  objective_value integer NOT NULL,  -- e.g. 20 sessions, 4 weeks streak
  discipline_type text,              -- only for type='discipline'
  start_date date NOT NULL,
  end_date date NOT NULL,
  scope text NOT NULL CHECK (scope IN ('ecurie','suivis','national')),
  ecurie_name text,                  -- only for scope='ecurie'
  is_national boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read challenges"
  ON challenges FOR SELECT USING (true);
CREATE POLICY "Users can create ecurie challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ── Challenge Participants ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  horse_id uuid REFERENCES horses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','completed','declined')),
  progress integer NOT NULL DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own participation"
  ON challenge_participants FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "Anyone can read participants"
  ON challenge_participants FOR SELECT USING (true);

-- ── User Follows ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own follows"
  ON user_follows FOR ALL
  USING (follower_id = auth.uid());
CREATE POLICY "Anyone can read follows"
  ON user_follows FOR SELECT USING (true);

-- ── Seed national challenges ───────────────────────────────────────────────────
INSERT INTO challenges (name, description, type, objective_value, start_date, end_date, scope, is_national)
VALUES
  (
    'Défi Régularité Mars',
    'Travaillez au moins 3 fois par semaine pendant tout le mois de mars.',
    'regularite', 4,
    '2026-03-01', '2026-03-31',
    'national', true
  ),
  (
    'Challenge Volume Printemps',
    'Cumulez 20 séances entre le 1er mars et le 30 avril.',
    'volume', 20,
    '2026-03-01', '2026-04-30',
    'national', true
  ),
  (
    'Défi Dressage Avril',
    'Réalisez 8 séances de dressage en avril.',
    'discipline', 8,
    '2026-04-01', '2026-04-30',
    'national', true
  )
ON CONFLICT DO NOTHING;
