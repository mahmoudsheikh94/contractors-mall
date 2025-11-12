-- ============================================
-- Fix delivery_proofs Bucket Policies
-- Date: January 13, 2025
-- Purpose: Make delivery_proofs bucket public and add SELECT policy
-- ============================================
--
-- PROBLEM:
-- delivery_proofs bucket is private with INSERT policy but no SELECT policy.
-- Users can upload files but cannot read/view them.
-- Code uses getPublicUrl() which requires a public bucket.
--
-- SOLUTION:
-- 1. Make the bucket public (allows public URL generation)
-- 2. Add SELECT policy for public read access
-- This is needed so contractors, suppliers, and admins can view delivery confirmations.
--
-- SECURITY:
-- - Anyone can view delivery photos (public bucket)
-- - Only authenticated users can upload
-- - Only file owners can update/delete their uploads
-- ============================================

-- Make the bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'delivery_proofs';

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Public can view delivery proofs" ON storage.objects;

-- Create SELECT policy for delivery_proofs bucket (public read access)
CREATE POLICY "Public can view delivery proofs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'delivery_proofs');

-- Add UPDATE policy for owners to modify their uploads if needed
DROP POLICY IF EXISTS "Users can update their delivery proofs" ON storage.objects;
CREATE POLICY "Users can update their delivery proofs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'delivery_proofs' AND auth.uid() = owner);

-- Add DELETE policy for owners
DROP POLICY IF EXISTS "Users can delete their delivery proofs" ON storage.objects;
CREATE POLICY "Users can delete their delivery proofs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'delivery_proofs' AND auth.uid() = owner);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE '%delivery_proofs%'
ORDER BY policyname;
