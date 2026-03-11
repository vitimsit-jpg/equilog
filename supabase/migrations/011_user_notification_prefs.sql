-- Migration 011 — Add notification preferences to users

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_health_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_summary BOOLEAN DEFAULT true;
