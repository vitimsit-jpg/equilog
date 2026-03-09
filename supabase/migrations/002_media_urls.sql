-- Migration 002 — Add media_urls + feed_comments
-- Run in Supabase SQL Editor or via CLI

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Storage bucket: session-media (public)
-- Create manually in Supabase Dashboard > Storage > New bucket
-- Name: session-media, Public: true

-- Storage policies for session-media bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('session-media', 'session-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Authenticated users can upload session media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'session-media');

CREATE POLICY IF NOT EXISTS "Anyone can view session media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'session-media');

CREATE POLICY IF NOT EXISTS "Users can delete own session media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'session-media');

-- Feed comments
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('session', 'competition')),
  item_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in ecurie can read comments" ON public.feed_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.feed_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feed_comments_item ON public.feed_comments(item_id, created_at);
