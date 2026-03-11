-- Migration 004 — Horse avatars
-- Add avatar_url column to horses table

ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage bucket: horse-avatars (public)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('horse-avatars', 'horse-avatars', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies for horse-avatars bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload horse avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'horse-avatars');

CREATE POLICY IF NOT EXISTS "Anyone can view horse avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'horse-avatars');

CREATE POLICY IF NOT EXISTS "Users can update horse avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'horse-avatars');

CREATE POLICY IF NOT EXISTS "Users can delete horse avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'horse-avatars');
