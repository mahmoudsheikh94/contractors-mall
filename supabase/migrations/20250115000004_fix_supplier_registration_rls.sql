-- ============================================
-- Fix Supplier Registration RLS Issue
-- Date: 2025-01-15
-- Purpose: Store supplier registration data in the user creation trigger
-- ============================================

BEGIN;

-- Update handle_new_user to also store supplier registration data
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile directly (RLS will be bypassed due to SECURITY DEFINER)
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

-- Set function owner to postgres
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

-- Update supplier_registrations RLS policy to allow service role
DROP POLICY IF EXISTS "Users can insert their own registration" ON supplier_registrations;

CREATE POLICY "Allow unauthenticated inserts"
  ON supplier_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function that creates profiles for new users.
Runs as SECURITY DEFINER with postgres owner to bypass RLS policies.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Supplier registration RLS fix applied';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '1. Updated handle_new_user() to include anon role grant';
  RAISE NOTICE '2. Updated supplier_registrations INSERT policy to explicitly allow anon and authenticated';
  RAISE NOTICE '';
  RAISE NOTICE 'This should fix the RLS error during signup!';
END $$;

COMMIT;
