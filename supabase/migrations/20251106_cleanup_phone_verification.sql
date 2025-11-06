-- Migration: Remove Phone Verification System
-- Date: 2025-11-06
-- Description: Removes phone verification columns, functions, and indexes since no SMS integration exists
-- This simplifies the system to use email verification only

-- ============================================================================
-- PART 1: Remove Phone Verification Functions
-- ============================================================================

-- Drop phone verification functions (these were never integrated with SMS)
DROP FUNCTION IF EXISTS verify_phone_number(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_phone_verification(UUID) CASCADE;

-- ============================================================================
-- PART 2: Remove Phone Verification Columns from Profiles
-- ============================================================================

-- Remove phone verification columns
ALTER TABLE profiles
  DROP COLUMN IF EXISTS phone_verified CASCADE,
  DROP COLUMN IF EXISTS phone_verified_at CASCADE,
  DROP COLUMN IF EXISTS verification_method CASCADE;

-- ============================================================================
-- PART 3: Remove Unnecessary Indexes
-- ============================================================================

-- Drop indexes for removed columns
DROP INDEX IF EXISTS idx_profiles_phone_verified;
DROP INDEX IF EXISTS idx_profiles_verification_method;

-- Keep email verification index (still needed)
-- idx_profiles_email_verified should remain

-- ============================================================================
-- PART 4: Update Comments
-- ============================================================================

COMMENT ON COLUMN profiles.email_verified IS 'Email verified via Supabase Auth email confirmation';
COMMENT ON COLUMN profiles.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN profiles.phone IS 'Phone number for contact purposes (not used for verification)';

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

-- List remaining verification-related columns (should only be email_verified and email_verified_at)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name LIKE '%verif%';

  RAISE NOTICE '✅ Profiles table now has % verification-related columns (should be 2: email_verified, email_verified_at)', v_count;
END $$;

-- Check that functions were removed
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname IN ('verify_phone_number', 'send_phone_verification');

  IF v_count = 0 THEN
    RAISE NOTICE '✅ Phone verification functions removed successfully';
  ELSE
    RAISE WARNING '⚠️  Some phone verification functions still exist!';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles - Email verification only (phone is for contact purposes)';
