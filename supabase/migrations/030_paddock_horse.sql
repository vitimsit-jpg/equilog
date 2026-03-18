-- Add paddock checked status to daily logs
ALTER TABLE horse_daily_logs ADD COLUMN IF NOT EXISTS paddock_checked BOOLEAN DEFAULT false;

-- Add coach note to horses
ALTER TABLE horses ADD COLUMN IF NOT EXISTS coach_note TEXT;
