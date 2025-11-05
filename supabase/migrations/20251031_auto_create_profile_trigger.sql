-- ============================================
-- Auto-Create Profile Trigger
-- Date: 2025-10-31
-- Purpose: Automatically create profile when user signs up
-- ============================================

BEGIN;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create profile automatically when user is created
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
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'supplier_admin'),
    -- User is verified if email_confirmed_at is set
    NEW.email_confirmed_at IS NOT NULL,
    NEW.email_confirmed_at,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Grant necessary permissions first
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Set the owner of the function to be able to create triggers
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Create trigger on auth.users (must run as superuser)
DO $$
BEGIN
  -- Check if running as superuser
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper = true
  ) THEN
    RAISE EXCEPTION 'This migration must be run as a superuser (postgres role)';
  END IF;

  -- Drop and recreate trigger
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
END $$;

-- Add comments
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates profile when new user signs up. Handles email verification status.';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers profile creation on user signup';

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '1. User signs up via supabase.auth.signUp()';
    RAISE NOTICE '2. Trigger automatically creates profile';
    RAISE NOTICE '3. If email confirmation enabled:';
    RAISE NOTICE '   - Profile created with email_verified = false';
    RAISE NOTICE '   - User can login but limited features';
    RAISE NOTICE '   - Clicking email link updates email_verified = true';
    RAISE NOTICE '4. If email confirmation disabled:';
    RAISE NOTICE '   - Profile created with email_verified = true';
    RAISE NOTICE '   - Full access immediately';
  ELSE
    RAISE WARNING '❌ Trigger was not created!';
  END IF;
END $$;

COMMIT;
