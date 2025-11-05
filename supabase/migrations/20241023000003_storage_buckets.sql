-- ==========================================
-- STORAGE BUCKETS SETUP
-- ==========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product_media', 'product_media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('delivery_proofs', 'delivery_proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('dispute_media', 'dispute_media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STORAGE POLICIES
-- ==========================================
-- Note: Storage buckets must be created manually in Supabase dashboard
-- These policies will be created automatically when buckets exist
-- For now, we'll use simple bucket-level permissions

-- Drop existing policies to make migration idempotent
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload delivery proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload dispute media" ON storage.objects;

-- Simple policies - will be enhanced after buckets are created
-- Product Media: Public bucket (configured via bucket settings)
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product_media');

-- Authenticated users can upload to product_media
CREATE POLICY "Anyone can upload product images" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'product_media' AND auth.uid() IS NOT NULL);

-- Authenticated users can upload to delivery_proofs
CREATE POLICY "Anyone can upload delivery proofs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'delivery_proofs' AND auth.uid() IS NOT NULL);

-- Authenticated users can upload to dispute_media
CREATE POLICY "Anyone can upload dispute media" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'dispute_media' AND auth.uid() IS NOT NULL);

-- ==========================================
-- HELPER FUNCTION FOR FILE URL GENERATION
-- ==========================================

CREATE OR REPLACE FUNCTION get_storage_url(p_bucket TEXT, p_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN format('%s/storage/v1/object/public/%s/%s',
    current_setting('app.settings.supabase_url', true),
    p_bucket,
    p_path
  );
END;
$$ LANGUAGE plpgsql;