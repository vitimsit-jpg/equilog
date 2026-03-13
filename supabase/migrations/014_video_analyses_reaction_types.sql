-- Add reaction_type to feed_reactions (one reaction per user per item, but typed)
ALTER TABLE feed_reactions ADD COLUMN IF NOT EXISTS reaction_type TEXT NOT NULL DEFAULT 'like';

-- Drop old unique constraint if any, add new one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feed_reactions_user_item_unique'
  ) THEN
    ALTER TABLE feed_reactions
      ADD CONSTRAINT feed_reactions_user_item_unique UNIQUE (user_id, item_type, item_id);
  END IF;
END $$;

-- video_analyses table
CREATE TABLE IF NOT EXISTS video_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID REFERENCES horses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  allure TEXT,
  score INTEGER,
  posture_cheval TEXT,
  position_cavalier TEXT,
  points_forts TEXT[],
  axes_amelioration TEXT[],
  conseil_principal TEXT
);

ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own video analyses" ON video_analyses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own video analyses" ON video_analyses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own video analyses" ON video_analyses
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_video_analyses_horse_id ON video_analyses(horse_id, created_at DESC);
