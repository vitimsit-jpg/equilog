-- Migration 044: RGPD — opt_out_analytics
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS opt_out_analytics BOOLEAN DEFAULT false;
