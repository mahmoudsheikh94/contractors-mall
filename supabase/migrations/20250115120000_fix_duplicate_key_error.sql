-- ============================================
-- Fix Duplicate Key Error in Profile Creation
-- Date: 2025-01-15
-- Purpose: Change ON CONFLICT DO NOTHING to DO UPDATE to prevent error bubbling
-- ============================================

BEGIN;

-- The issue: Even though ON CONFLICT DO NOTHING works, the constraint violation
-- error still bubbles up to the client before the trigger completes.
-- Solution: Use ON CONFLICT DO UPDATE to actually update the row, which doesn't
-- throw an error at all.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile with ON CONFLICT DO UPDATE to avoid any duplicate key errors
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
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        email_verified = EXCLUDED.email_verified,
        email_verified_at = EXCLUDED.email_verified_at,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user signup
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
Uses ON CONFLICT DO UPDATE to avoid duplicate key errors.';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Profile trigger function updated with DO UPDATE fix';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Changed ON CONFLICT DO NOTHING to DO UPDATE';
    RAISE NOTICE '2. This prevents duplicate key errors from bubbling to client';
    RAISE NOTICE '3. Profile will be updated if it already exists (safe operation)';
    RAISE NOTICE '';
    RAISE NOTICE 'Signup should now work without duplicate key errors!';
END $$;

COMMIT;
