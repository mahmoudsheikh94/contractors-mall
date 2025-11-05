-- ============================================
-- Add Email Verification to Profiles
-- Date: 2025-10-31
-- Purpose: Track email verification status
-- ============================================

BEGIN;

-- Add email verification columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified
ON profiles(email_verified);

-- Update existing users to be verified (they registered without email confirmation)
-- This is safe because they already completed registration successfully
UPDATE profiles
SET email_verified = true,
    email_verified_at = created_at
WHERE email_verified IS NULL
   OR email_verified = false;

-- Add comments
COMMENT ON COLUMN profiles.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN profiles.email_verified_at IS 'Timestamp when email was verified';

-- Verification
DO $$
DECLARE
  verified_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM profiles;
  SELECT COUNT(*) INTO verified_count FROM profiles WHERE email_verified = true;

  RAISE NOTICE '';
  RAISE NOTICE '=== Email Verification Migration ===';
  RAISE NOTICE 'Total profiles: %', total_count;
  RAISE NOTICE 'Verified profiles: %', verified_count;
  RAISE NOTICE '✅ All existing users marked as verified';
  RAISE NOTICE '';
  RAISE NOTICE 'New users will:';
  RAISE NOTICE '  - Start with email_verified = false';
  RAISE NOTICE '  - Can browse but not place orders';
  RAISE NOTICE '  - Verify via email confirmation link';
END $$;

COMMIT;
