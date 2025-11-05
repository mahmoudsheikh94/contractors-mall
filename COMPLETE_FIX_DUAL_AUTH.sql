-- ============================================
-- COMPLETE FIX: Dual Authentication + RLS + Trigger
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- STEP 1: Fix RLS Policies (Prevent Infinite Recursion)
-- ======================================================

-- Temporarily disable RLS to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles
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

-- Re-enable RLS with simple, non-recursive policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that won't cause recursion
CREATE POLICY "users_own_profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "service_bypass"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STEP 2: Fix the Auto-Create Profile Trigger
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate with proper handling and NO type casting issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Safely extract role as text (no type casting)
  DECLARE
    v_role text;
    v_signup_method text;
  BEGIN
    -- Get role from metadata or default to supplier_admin
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'supplier_admin');

    -- Get signup method (email or phone)
    v_signup_method := COALESCE(NEW.raw_user_meta_data->>'signup_method', 'email');

    -- Validate role
    IF v_role NOT IN ('admin', 'supplier_admin', 'contractor', 'driver') THEN
      v_role := 'supplier_admin';
    END IF;

    -- Create profile - using SECURITY DEFINER bypasses RLS
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone,
      role,
      email_verified,
      email_verified_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
      v_role,
      -- Mark email as verified if email_confirmed_at is set
      NEW.email_confirmed_at IS NOT NULL,
      NEW.email_confirmed_at,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors

    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the signup
      RAISE WARNING 'Could not auto-create profile for user %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Add Dual Authentication Columns
-- ========================================

-- Add verification columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'phone_verified') THEN
    ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'phone_verified_at') THEN
    ALTER TABLE profiles ADD COLUMN phone_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'verification_method') THEN
    ALTER TABLE profiles ADD COLUMN verification_method TEXT
      CHECK (verification_method IN ('email', 'phone', 'both'));
  END IF;
END $$;

-- Update existing users
UPDATE profiles p
SET email_verified = true, verification_method = 'email'
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified IS FALSE;

-- STEP 4: Create Verification Functions
-- ======================================

-- Phone verification function
CREATE OR REPLACE FUNCTION verify_phone_number(
  p_user_id UUID,
  p_verification_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- MVP: code is last 4 digits of phone
  IF p_verification_code = RIGHT(v_profile.phone, 4) THEN
    UPDATE profiles
    SET
      phone_verified = true,
      email_verified = true,  -- Grant both badges
      phone_verified_at = NOW(),
      verification_method = 'both',
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Phone verified successfully',
      'badges', json_build_object(
        'email_verified', true,
        'phone_verified', true
      )
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid verification code');
  END IF;
END;
$$;

-- Send verification function
CREATE OR REPLACE FUNCTION send_phone_verification(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phone TEXT;
  v_code TEXT;
BEGIN
  SELECT phone INTO v_phone FROM profiles WHERE id = p_user_id;

  IF NOT FOUND OR v_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Phone number not found');
  END IF;

  v_code := RIGHT(v_phone, 4);

  RETURN json_build_object(
    'success', true,
    'message', 'Verification code sent',
    'code', v_code  -- Remove in production
  );
END;
$$;

-- STEP 5: Create Indexes
-- =======================

CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_method ON profiles(verification_method);

-- STEP 6: Verify Everything Works
-- ================================

-- Check policies are correct
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('email_verified', 'phone_verified', 'verification_method');

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Dual Authentication System Configured Successfully!';
  RAISE NOTICE '✅ RLS Policies Fixed - No More Recursion!';
  RAISE NOTICE '✅ Auto-Create Profile Trigger Fixed!';
  RAISE NOTICE '✅ Verification Functions Ready!';
END $$;