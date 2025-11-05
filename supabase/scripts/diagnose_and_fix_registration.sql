-- ============================================
-- DIAGNOSE AND FIX REGISTRATION RLS POLICIES
-- ============================================
-- This script helps diagnose why registration is failing
-- and guides you through fixing the RLS policies

-- ============================================
-- STEP 1: DIAGNOSTIC - Check Current Policies
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '=== STEP 1: Checking Current RLS Policies ===';
END $$;

-- Check profiles table policies
SELECT
  '👤 PROFILES TABLE' as category,
  policyname,
  cmd as policy_type,
  CASE
    WHEN policyname LIKE '%insert%' OR policyname LIKE '%create%' THEN '✅ INSERT POLICY FOUND'
    WHEN cmd = 'INSERT' THEN '✅ INSERT POLICY FOUND'
    ELSE ''
  END as status
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Check suppliers table policies
SELECT
  '🏢 SUPPLIERS TABLE' as category,
  policyname,
  cmd as policy_type,
  CASE
    WHEN policyname LIKE '%insert%' OR policyname LIKE '%create%' THEN '✅ INSERT POLICY FOUND'
    WHEN cmd = 'INSERT' THEN '✅ INSERT POLICY FOUND'
    ELSE ''
  END as status
FROM pg_policies
WHERE tablename = 'suppliers'
ORDER BY cmd, policyname;

-- Summary check
DO $$
DECLARE
  profiles_insert_count INTEGER;
  suppliers_insert_count INTEGER;
BEGIN
  -- Count INSERT policies on profiles
  SELECT COUNT(*) INTO profiles_insert_count
  FROM pg_policies
  WHERE tablename = 'profiles' AND cmd = 'INSERT';

  -- Count INSERT policies on suppliers
  SELECT COUNT(*) INTO suppliers_insert_count
  FROM pg_policies
  WHERE tablename = 'suppliers' AND cmd = 'INSERT';

  RAISE NOTICE '';
  RAISE NOTICE '=== DIAGNOSTIC SUMMARY ===';
  RAISE NOTICE 'Profiles INSERT policies: %', profiles_insert_count;
  RAISE NOTICE 'Suppliers INSERT policies: %', suppliers_insert_count;
  RAISE NOTICE '';

  IF profiles_insert_count = 0 THEN
    RAISE WARNING '❌ PROBLEM: profiles table has NO INSERT policy!';
    RAISE NOTICE '   This is why registration fails at profile creation.';
  ELSE
    RAISE NOTICE '✅ profiles table has INSERT policy';
  END IF;

  IF suppliers_insert_count = 0 THEN
    RAISE WARNING '❌ PROBLEM: suppliers table has NO INSERT policy!';
    RAISE NOTICE '   Registration will fail at supplier creation.';
  ELSE
    RAISE NOTICE '✅ suppliers table has INSERT policy';
  END IF;

  RAISE NOTICE '';
  IF profiles_insert_count = 0 OR suppliers_insert_count = 0 THEN
    RAISE NOTICE '📋 NEXT STEP: Apply the fix migration';
    RAISE NOTICE '   File: supabase/migrations/20251031_fix_registration_rls_policies.sql';
    RAISE NOTICE '   Method 1: Copy and paste the file contents into Supabase SQL Editor';
    RAISE NOTICE '   Method 2: Run: pnpm supabase db push';
  ELSE
    RAISE NOTICE '✅ All required policies exist!';
    RAISE NOTICE '   If registration still fails, there may be a different issue.';
  END IF;
END $$;

-- ============================================
-- STEP 2: SHOW EXACT POLICY DEFINITIONS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 2: Current Policy Definitions ===';
END $$;

SELECT
  tablename,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('profiles', 'suppliers')
ORDER BY tablename, cmd, policyname;
