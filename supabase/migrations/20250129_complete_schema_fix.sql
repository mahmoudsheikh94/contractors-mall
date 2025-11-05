-- COMPLETE SCHEMA FIX: Fix ALL authentication issues
-- Run this ONCE to fix: phone NOT NULL, infinite recursion, language type, etc.

-- ============================================================================
-- PART 1: Fix Column Constraints
-- ============================================================================

-- Fix phone column to allow NULL (required for email-based auth)
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;

-- Ensure email column exists and allows NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- Fix language column - change from enum to TEXT if needed
DO $$
BEGIN
    -- Check current type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'preferred_language'
        AND data_type != 'text'
    ) THEN
        -- Convert enum to TEXT
        ALTER TABLE profiles
        ALTER COLUMN preferred_language TYPE TEXT
        USING preferred_language::TEXT;
    END IF;
END $$;

-- Ensure preferred_language has a default
ALTER TABLE profiles
ALTER COLUMN preferred_language SET DEFAULT 'ar';

-- Add check constraint for valid language values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'profiles'
        AND constraint_name = 'check_language_valid'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT check_language_valid
        CHECK (preferred_language IN ('ar', 'en'));
    END IF;
END $$;

-- ============================================================================
-- PART 2: Fix Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- PART 3: Drop ALL Existing Policies (Clean Slate)
-- ============================================================================

-- Drop every possible policy that might exist
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PART 4: Create Simple, Non-Recursive RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple INSERT policy - just check auth.uid() matches id
CREATE POLICY "simple_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Simple SELECT policy - just check auth.uid() matches id
CREATE POLICY "simple_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Simple UPDATE policy - just check auth.uid() matches id
CREATE POLICY "simple_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Simple DELETE policy - just check auth.uid() matches id
CREATE POLICY "simple_delete"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "service_all"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 5: Create Safe Upsert Function
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS upsert_profile CASCADE;

-- Create new upsert function that handles NULL values properly
CREATE OR REPLACE FUNCTION upsert_profile(
  user_id UUID,
  user_email TEXT DEFAULT NULL,
  user_phone TEXT DEFAULT NULL,
  user_full_name TEXT DEFAULT '',
  user_role TEXT DEFAULT 'contractor',
  user_language TEXT DEFAULT 'ar'
) RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
BEGIN
  -- Validate language
  IF user_language NOT IN ('ar', 'en') THEN
    user_language := 'ar';
  END IF;

  -- Validate role
  IF user_role NOT IN ('contractor', 'supplier_admin', 'driver', 'admin') THEN
    user_role := 'contractor';
  END IF;

  -- Upsert profile
  INSERT INTO profiles (
    id,
    email,
    phone,
    full_name,
    role,
    preferred_language,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_phone,
    COALESCE(NULLIF(user_full_name, ''), 'User'),
    user_role::user_role,
    user_language,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    full_name = CASE
      WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name != ''
      THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    role = COALESCE(EXCLUDED.role, profiles.role),
    preferred_language = COALESCE(EXCLUDED.preferred_language, profiles.preferred_language),
    updated_at = NOW()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_profile TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_profile TO service_role;

-- ============================================================================
-- PART 6: Verification Queries
-- ============================================================================

-- Check phone column (should allow NULL now)
DO $$
DECLARE
  v_nullable TEXT;
BEGIN
  SELECT is_nullable INTO v_nullable
  FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'phone';

  IF v_nullable = 'YES' THEN
    RAISE NOTICE '✅ Phone column allows NULL';
  ELSE
    RAISE WARNING '❌ Phone column still requires NOT NULL!';
  END IF;
END $$;

-- Check if policies were created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  RAISE NOTICE '✅ Created % RLS policies for profiles table', v_count;
END $$;

-- Check if function was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'upsert_profile') THEN
    RAISE NOTICE '✅ upsert_profile function created successfully';
  ELSE
    RAISE WARNING '❌ upsert_profile function was NOT created!';
  END IF;
END $$;

-- ============================================================================
-- PART 7: Test Profile Insert (Optional - Comment out after testing)
-- ============================================================================

-- Uncomment to test direct insert with NULL phone
/*
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO profiles (id, email, phone, full_name, role, preferred_language)
  VALUES (
    test_id,
    'test-migration@example.com',
    NULL, -- This should work now
    'Migration Test User',
    'contractor',
    'ar'
  );

  RAISE NOTICE '✅ Test insert with NULL phone succeeded - ID: %', test_id;

  -- Clean up test data
  DELETE FROM profiles WHERE id = test_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Test insert failed: %', SQLERRM;
END $$;
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles - Fixed: phone allows NULL, simple RLS policies';
COMMENT ON COLUMN profiles.phone IS 'Phone number - NULL for email-based auth';
COMMENT ON COLUMN profiles.email IS 'Email address - NULL for phone-based auth';
COMMENT ON FUNCTION upsert_profile IS 'Safe upsert handling NULL phone/email for different auth methods';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '
  ════════════════════════════════════════════════════════════════
  ✅ COMPLETE SCHEMA FIX APPLIED SUCCESSFULLY
  ════════════════════════════════════════════════════════════════
  Fixed:
  - Phone column now allows NULL (for email auth)
  - Email column exists and allows NULL (for phone auth)
  - Language column is TEXT with check constraint
  - All recursive RLS policies replaced with simple ones
  - Upsert function handles NULL values properly

  You can now:
  - Register users with email (phone will be NULL)
  - Register users with phone (email will be NULL)
  - No more infinite recursion errors
  - No more NOT NULL constraint violations

  Next step: Restart your dev server and test!
  ════════════════════════════════════════════════════════════════
  ';
END $$;