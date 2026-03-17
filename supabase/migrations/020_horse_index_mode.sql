-- Migration 020: Horse Index mode, status and calibration tracking
ALTER TABLE horses
  ADD COLUMN IF NOT EXISTS horse_index_mode       TEXT DEFAULT 'IE',
  ADD COLUMN IF NOT EXISTS horse_index_status     TEXT DEFAULT 'incomplet',
  ADD COLUMN IF NOT EXISTS horse_index_mode_changed_at TIMESTAMPTZ;
