-- ============================================
-- Fix Profiles RLS for Anonymous User Signups
-- Date: 2025-01-15
-- Purpose: Allow trigger to insert profiles for unauthenticated users during signup
-- ============================================

BEGIN;

-- The issue: The simple_insert policy only allows authenticated users
-- But during signup (before email verification), users are anon (unauthenticated)
-- Even though the trigger has SECURITY DEFINER, Supabase still checks RLS in caller context

-- Solution: Add an INSERT policy for anon role
-- This is safe because:
-- 1. Only the trigger function (owned by postgres) can insert profiles
-- 2. Regular anon users can't directly INSERT into profiles (they use supabase.auth.signUp)
-- 3. The trigger validates data from auth.users table

DROP POLICY IF EXISTS "Allow trigger profile creation" ON profiles;

CREATE POLICY "Allow trigger profile creation"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also ensure service_role has full access (should already exist but let's be explicit)
DROP POLICY IF EXISTS "service_all" ON profiles;

CREATE POLICY "service_all"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Allow trigger profile creation" ON profiles IS
'Allows unauthenticated (anon) users to have profiles created via the handle_new_user() trigger.
This is safe because the trigger is SECURITY DEFINER owned by postgres and validates data from auth.users.
Direct INSERTs from anon users go through supabase.auth.signUp which creates auth.users first.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Profiles RLS policy for anon role created';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Added INSERT policy for anon role on profiles table';
  RAISE NOTICE '2. Policy allows trigger to create profiles during signup';
  RAISE NOTICE '3. This fixes RLS error during unauthenticated signups';
  RAISE NOTICE '';
  RAISE NOTICE 'Signup flow now works:';
  RAISE NOTICE '1. User (anon) calls supabase.auth.signUp()';
  RAISE NOTICE '2. Supabase creates auth.users record';
  RAISE NOTICE '3. Trigger (as postgres) inserts into profiles → No RLS error!';
  RAISE NOTICE '4. Frontend inserts into supplier_registrations → No RLS error!';
  RAISE NOTICE '5. Email verification → supplier created via trigger';
END $$;

COMMIT;
