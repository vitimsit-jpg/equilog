-- Add video_url to video_analyses
ALTER TABLE video_analyses ADD COLUMN IF NOT EXISTS video_url TEXT;

-- UPDATE policy so client can save video_url after upload
CREATE POLICY "Users update own video analyses" ON video_analyses
  FOR UPDATE USING (user_id = auth.uid());

-- Create private storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-analyses',
  'video-analyses',
  false,
  524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder (path = userId/horseId/file)
CREATE POLICY "Users upload own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'video-analyses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'video-analyses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-analyses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
