-- Complete Authentication Fix: RLS Policies + Language Type + Functions
-- This migration fixes all auth-related issues comprehensively

-- ============================================================================
-- PART 1: Fix Enum Types
-- ============================================================================

-- Create user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('contractor', 'supplier_admin', 'driver', 'admin');
    END IF;
END $$;

-- Since language enum might not exist and you're using TEXT, let's handle both cases
-- First, check if profiles.preferred_language is already TEXT
DO $$
BEGIN
    -- Check if preferred_language column exists and its type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'preferred_language'
        AND data_type != 'text'
    ) THEN
        -- Change to TEXT if it's not already TEXT
        ALTER TABLE profiles
        ALTER COLUMN preferred_language TYPE TEXT
        USING preferred_language::TEXT;
    END IF;

    -- Add check constraint for language values
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'profiles'
        AND column_name = 'preferred_language'
        AND constraint_name = 'profiles_preferred_language_check'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_preferred_language_check
        CHECK (preferred_language IN ('ar', 'en'));
    END IF;
END $$;

-- ============================================================================
-- PART 2: Ensure All Required Columns Exist
-- ============================================================================

-- Add email column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add phone column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Ensure preferred_language has a default
ALTER TABLE profiles
ALTER COLUMN preferred_language SET DEFAULT 'ar';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- PART 3: Drop ALL Old Policies (Clean Slate)
-- ============================================================================

-- Drop any possible policy names that might exist
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PART 4: Create Simple, Non-Recursive RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- INSERT: Users can only insert their own profile
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- SELECT: Users can only see their own profile
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own profile
CREATE POLICY "delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Service role bypasses all RLS
CREATE POLICY "service_role_all"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 5: Create Safe Upsert Function (No RLS Issues)
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS upsert_profile CASCADE;

-- Create new upsert function that handles duplicates gracefully
CREATE OR REPLACE FUNCTION upsert_profile(
  user_id UUID,
  user_email TEXT DEFAULT NULL,
  user_phone TEXT DEFAULT NULL,
  user_full_name TEXT DEFAULT '',
  user_role user_role DEFAULT 'contractor',
  user_language TEXT DEFAULT 'ar'
) RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_profile profiles;
BEGIN
    -- Validate language value
    IF user_language NOT IN ('ar', 'en') THEN
        user_language := 'ar';
    END IF;

    -- Attempt to insert or update
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
        user_full_name,
        user_role,
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
    RETURNING * INTO result_profile;

    RETURN result_profile;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_profile TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_profile TO service_role;

-- ============================================================================
-- PART 6: Create Helper Function to Check Profile Exists (No Recursion)
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS profile_exists CASCADE;

-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION profile_exists(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE id = user_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION profile_exists TO authenticated;
GRANT EXECUTE ON FUNCTION profile_exists TO service_role;

-- ============================================================================
-- PART 7: Create Function for Safe Profile Creation from Trigger
-- ============================================================================

-- Drop old trigger and function if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

-- This function can be called by a trigger but won't cause recursion
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only try to create profile if it doesn't exist
    -- Using direct check, not through RLS
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
        BEGIN
            INSERT INTO profiles (
                id,
                email,
                phone,
                full_name,
                role,
                preferred_language,
                is_active
            ) VALUES (
                NEW.id,
                NEW.email,
                NEW.phone,
                COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
                COALESCE(NEW.raw_user_meta_data->>'role', 'contractor')::user_role,
                COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'ar'),
                true
            ) ON CONFLICT (id) DO NOTHING;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the trigger
                RAISE WARNING 'Could not auto-create profile for user %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$;

-- Optional: Enable auto-profile creation (commented out by default)
-- Uncomment if you want profiles auto-created on user signup
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 8: Permissions
-- ============================================================================

-- Ensure proper permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================================================
-- PART 9: Verification Queries (Comment these out after testing)
-- ============================================================================

-- Check current policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'profiles';

-- Check if functions exist
-- SELECT proname, prosrc FROM pg_proc
-- WHERE proname IN ('upsert_profile', 'profile_exists', 'handle_new_user');

-- Test the upsert function (replace with a real user ID)
-- SELECT * FROM upsert_profile(
--   'test-user-id'::uuid,
--   'test@example.com',
--   '+962791234567',
--   'Test User',
--   'contractor',
--   'ar'
-- );

COMMENT ON TABLE profiles IS 'User profiles with fixed RLS policies (no recursion)';
COMMENT ON FUNCTION upsert_profile IS 'Safe upsert that handles duplicates and bypasses RLS';
COMMENT ON FUNCTION profile_exists IS 'Check profile existence without RLS recursion';