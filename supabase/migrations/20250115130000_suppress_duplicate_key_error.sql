-- ============================================
-- Suppress Duplicate Key Error Completely
-- Date: 2025-01-15
-- Purpose: Use exception handling to completely suppress duplicate key errors
-- ============================================

BEGIN;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new version that explicitly catches duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Try to insert the profile
    -- If it already exists, update it instead
    -- The key difference: we catch the unique_violation exception explicitly
    BEGIN
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
        );
    EXCEPTION
        WHEN unique_violation THEN
            -- If profile already exists, update it
            UPDATE public.profiles
            SET
                email = NEW.email,
                phone = NEW.phone,
                full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name),
                email_verified = NEW.email_confirmed_at IS NOT NULL,
                email_verified_at = NEW.email_confirmed_at,
                updated_at = NOW()
            WHERE id = NEW.id;
    END;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any other errors but don't fail the user signup
        RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Set function owner to postgres (superuser who can bypass RLS)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function that automatically creates user profiles on signup.
Runs as SECURITY DEFINER with postgres owner to bypass RLS policies.
Uses explicit exception handling to completely suppress duplicate key errors.
If profile exists, updates it instead of trying to insert.';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Profile trigger function updated with explicit exception handling';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Replaced ON CONFLICT with explicit EXCEPTION WHEN unique_violation';
    RAISE NOTICE '2. Catches duplicate key errors BEFORE they bubble to client';
    RAISE NOTICE '3. Updates existing profile if duplicate is detected';
    RAISE NOTICE '';
    RAISE NOTICE 'This should completely eliminate duplicate key errors from appearing to users!';
END $$;

COMMIT;
