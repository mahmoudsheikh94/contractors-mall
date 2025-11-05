-- ============================================
-- VERIFY REGISTRATION FIX
-- ============================================
-- Run this AFTER applying the fix migration to verify it worked

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE '  VERIFYING REGISTRATION RLS POLICIES FIX';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- 1. Check All Profiles Policies
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '1️⃣  Checking profiles table policies...';
END $$;

SELECT
  policyname,
  cmd as policy_type
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- 2. Check All Suppliers Policies
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣  Checking suppliers table policies...';
END $$;

SELECT
  policyname,
  cmd as policy_type
FROM pg_policies
WHERE tablename = 'suppliers'
ORDER BY cmd, policyname;

-- ============================================
-- 3. Verify Required Policies Exist
-- ============================================

DO $$
DECLARE
  profiles_insert_exists BOOLEAN;
  profiles_update_exists BOOLEAN;
  suppliers_insert_exists BOOLEAN;
  suppliers_update_exists BOOLEAN;
  all_passed BOOLEAN := true;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣  Verifying required policies...';
  RAISE NOTICE '';

  -- Check profiles INSERT
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'INSERT'
  ) INTO profiles_insert_exists;

  -- Check profiles UPDATE
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND cmd = 'UPDATE'
  ) INTO profiles_update_exists;

  -- Check suppliers INSERT
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'suppliers' AND cmd = 'INSERT'
  ) INTO suppliers_insert_exists;

  -- Check suppliers UPDATE
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'suppliers' AND cmd = 'UPDATE'
  ) INTO suppliers_update_exists;

  -- Report results
  IF profiles_insert_exists THEN
    RAISE NOTICE '✅ profiles: INSERT policy exists';
  ELSE
    RAISE WARNING '❌ profiles: INSERT policy MISSING!';
    all_passed := false;
  END IF;

  IF profiles_update_exists THEN
    RAISE NOTICE '✅ profiles: UPDATE policy exists';
  ELSE
    RAISE WARNING '❌ profiles: UPDATE policy MISSING!';
    all_passed := false;
  END IF;

  IF suppliers_insert_exists THEN
    RAISE NOTICE '✅ suppliers: INSERT policy exists';
  ELSE
    RAISE WARNING '❌ suppliers: INSERT policy MISSING!';
    all_passed := false;
  END IF;

  IF suppliers_update_exists THEN
    RAISE NOTICE '✅ suppliers: UPDATE policy exists';
  ELSE
    RAISE WARNING '❌ suppliers: UPDATE policy MISSING!';
    all_passed := false;
  END IF;

  RAISE NOTICE '';
  IF all_passed THEN
    RAISE NOTICE '=================================================';
    RAISE NOTICE '  ✅ SUCCESS! All required policies exist!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test registration at:';
    RAISE NOTICE 'http://localhost:3001/auth/register';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected behavior:';
    RAISE NOTICE '1. Fill out the registration form';
    RAISE NOTICE '2. Submit the form';
    RAISE NOTICE '3. Should redirect to login page with success message';
    RAISE NOTICE '4. NO "42501" RLS error should appear';
  ELSE
    RAISE WARNING '=================================================';
    RAISE WARNING '  ❌ FAILED! Some policies are still missing!';
    RAISE WARNING '=================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'The migration may not have been applied correctly.';
    RAISE NOTICE 'Try:';
    RAISE NOTICE '1. Check that you ran the entire migration file';
    RAISE NOTICE '2. Check for any errors in the SQL output';
    RAISE NOTICE '3. Try running the migration again';
  END IF;
END $$;
