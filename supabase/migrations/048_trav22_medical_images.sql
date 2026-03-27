-- ═══════════════════════════════════════════════════════════════════
-- TRAV-22 : Bucket médias pour les examens médicaux (IR mode)
-- ═══════════════════════════════════════════════════════════════════

-- Bucket privé pour les images/PDF d'examens médicaux
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-images',
  'medical-images',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies pour le bucket medical-images
CREATE POLICY "medical_images_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'medical-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "medical_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'medical-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "medical_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'medical-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
