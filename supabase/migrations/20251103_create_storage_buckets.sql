-- ============================================
-- Create Storage Buckets for Delivery Photos
-- Date: 2025-11-03
-- Purpose: Setup storage for delivery confirmation photos
-- ============================================

-- Create deliveries bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deliveries',
  'deliveries',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for delivery photos
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'deliveries');

-- Allow authenticated users to upload delivery photos
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deliveries');

-- Allow suppliers to update/delete their own delivery photos
CREATE POLICY "Owner Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'deliveries' AND auth.uid() = owner);

CREATE POLICY "Owner Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'deliveries' AND auth.uid() = owner);

-- Add comments
COMMENT ON POLICY "Public Read Access" ON storage.objects IS 'Allow public read access to delivery photos';
COMMENT ON POLICY "Authenticated Upload Access" ON storage.objects IS 'Allow authenticated suppliers to upload delivery photos';
