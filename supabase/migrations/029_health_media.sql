-- Add media_urls to health_records
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Create health-media storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('health-media', 'health-media', true, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload health media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'health-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Health media is publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'health-media');

CREATE POLICY "Users can delete their health media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'health-media' AND (storage.foldername(name))[1] = auth.uid()::text);
