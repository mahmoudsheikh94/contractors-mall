-- ============================================
-- Fix Profile Creation Trigger to Bypass RLS
-- Date: 2025-01-15
-- Purpose: Ensure trigger can insert profiles even with email confirmation ON
-- ============================================

BEGIN;

-- The issue is that SECURITY DEFINER alone isn't enough
-- We need to ensure the function runs as a role that can bypass RLS
-- The postgres role or service_role can bypass RLS

-- Drop and recreate the trigger function with proper settings
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the trigger function that will run as service_role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile directly (RLS will be bypassed due to SECURITY DEFINER)
    -- Using INSERT with ON CONFLICT to handle race conditions
    INSERT INTO public.profiles (
        id,
        email,
        phone,
        full_name,
        role,
        preferred_language,
        is_active,
        email_verified,
        email_verified_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'contractor'),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'ar'),
        true,
        NEW.email_confirmed_at IS NOT NULL,
        NEW.email_confirmed_at,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user signup
        RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to authenticated users (so trigger can run)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Ensure the function owner is postgres (superuser who can bypass RLS)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Add comment to document the fix
COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function that automatically creates user profiles on signup.
Runs as SECURITY DEFINER with postgres owner to bypass RLS policies.
This ensures profiles are created even before email verification.';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Profile trigger function recreated with proper RLS bypass';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Function set as SECURITY DEFINER';
    RAISE NOTICE '2. Function owner set to postgres (superuser)';
    RAISE NOTICE '3. Execute permissions granted to authenticated and service_role';
    RAISE NOTICE '4. Trigger recreated on auth.users table';
    RAISE NOTICE '';
    RAISE NOTICE 'Auth Flow (Email Confirmation ON):';
    RAISE NOTICE '1. User submits signup form';
    RAISE NOTICE '2. Supabase creates auth.users record';
    RAISE NOTICE '3. Trigger automatically creates profile (bypassing RLS)';
    RAISE NOTICE '4. User receives verification email';
    RAISE NOTICE '5. User clicks link → email verified';
    RAISE NOTICE '6. Auth callback sends welcome email';
    RAISE NOTICE '7. User redirected based on role';
END $$;

COMMIT;
