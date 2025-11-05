-- Fix infinite recursion RLS policy error
-- Run this in Supabase SQL Editor immediately

-- Drop the conflicting policy if it exists
DROP POLICY IF EXISTS "Users can verify their own phone" ON profiles;

-- The profiles table already has RLS policies that handle user access
-- No need to add additional UPDATE policies as they conflict with existing ones
-- The SECURITY DEFINER functions (verify_phone_number, send_phone_verification)
-- bypass RLS anyway, so they don't need these policies

-- Verify the fix worked by checking existing policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';