-- 061: Module Balade GPS — tracés GPS liés aux training_sessions de type "balade"

-- Flag sur training_sessions pour filtrage rapide dans le feed
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS has_gps_track boolean DEFAULT false;

-- Table des tracés GPS
CREATE TABLE IF NOT EXISTS balade_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coordinates jsonb NOT NULL DEFAULT '[]',
  distance_km numeric(6,2),
  elevation_gain_m numeric(6,1),
  avg_speed_kmh numeric(4,1),
  max_speed_kmh numeric(4,1),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_session_id)
);

ALTER TABLE balade_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tracks"
  ON balade_tracks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_balade_tracks_horse ON balade_tracks(horse_id);
CREATE INDEX idx_balade_tracks_session ON balade_tracks(training_session_id);
CREATE INDEX idx_training_sessions_gps ON training_sessions(has_gps_track) WHERE has_gps_track = true;
