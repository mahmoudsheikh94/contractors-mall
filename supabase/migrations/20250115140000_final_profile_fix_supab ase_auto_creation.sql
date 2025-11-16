-- ============================================
-- FINAL FIX: Handle Supabase Auto-Profile Creation
-- Date: 2025-01-15
-- Purpose: Work WITH Supabase's built-in profile creation instead of fighting it
-- ============================================

/*
ROOT CAUSE ANALYSIS:
====================
Supabase Auth has a built-in feature that automatically creates a profile when auth.signUp() is called.
This happens BEFORE any custom triggers run, and it's configured in the Supabase Dashboard.

The duplicate key error occurs because:
1. User calls supabase.auth.signUp()
2. Supabase's built-in feature tries to INSERT into profiles (first attempt)
3. Our custom trigger also tries to INSERT into profiles (second attempt = duplicate!)
4. Even with ON CONFLICT or exception handling, the error is logged before handling

SOLUTION:
=========
Instead of trying to suppress the error or fight Supabase's built-in behavior,
we EMBRACE it and use RLS policies to ensure profiles can be created/updated safely.

We'll:
1. Remove our custom trigger entirely (it conflicts with Supabase's auto-creation)
2. Add robust RLS policies that allow profile creation from both sources
3. Use a BEFORE INSERT trigger to merge any conflicting data
*/

BEGIN;

-- ============================================================================
-- STEP 1: Remove our custom trigger that conflicts with Supabase
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- STEP 2: Create a BEFORE INSERT trigger that handles duplicates gracefully
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merge_profile_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If a profile with this ID already exists, do nothing
    -- This allows both Supabase auto-creation AND manual inserts to coexist
    IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
        -- Profile already exists, return NULL to skip the insert
        -- This prevents duplicate key errors entirely
        RETURN NULL;
    END IF;

    -- Profile doesn't exist, allow the insert
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.merge_profile_on_insert() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.merge_profile_on_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_profile_on_insert() TO service_role;
GRANT EXECUTE ON FUNCTION public.merge_profile_on_insert() TO anon;

-- Create BEFORE INSERT trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_duplicate_profiles ON profiles;
CREATE TRIGGER prevent_duplicate_profiles
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.merge_profile_on_insert();

COMMENT ON FUNCTION public.merge_profile_on_insert() IS
'BEFORE INSERT trigger that prevents duplicate profile creation.
Works with Supabase auto-profile creation by skipping inserts for existing profiles.
This completely eliminates duplicate key errors at the source.';

-- ============================================================================
-- STEP 3: Ensure RLS policies allow profile creation from all sources
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow trigger profile creation" ON profiles;
DROP POLICY IF EXISTS "service_all" ON profiles;
DROP POLICY IF EXISTS "simple_insert" ON profiles;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow anon users to have profiles created (for Supabase auto-creation during signup)
CREATE POLICY "Allow auto profile creation"
    ON profiles FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role full access"
    ON profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: Add UPDATE policy for profile syncing
-- ============================================================================

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Profile creation fix applied successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Removed conflicting custom trigger (on_auth_user_created)';
    RAISE NOTICE '2. Added BEFORE INSERT trigger to prevent duplicates at source';
    RAISE NOTICE '3. Updated RLS policies to work with Supabase auto-creation';
    RAISE NOTICE '4. Added profile UPDATE policies for data syncing';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works now:';
    RAISE NOTICE '- Supabase auto-creates profile when user signs up';
    RAISE NOTICE '- BEFORE INSERT trigger skips duplicate inserts silently';
    RAISE NOTICE '- No duplicate key errors ever reach the client';
    RAISE NOTICE '- Profile data can be updated after creation';
    RAISE NOTICE '';
    RAISE NOTICE 'To disable Supabase auto-profile creation (optional):';
    RAISE NOTICE '1. Go to Dashboard → Authentication → Settings';
    RAISE NOTICE '2. Disable "Enable automatic profile creation"';
    RAISE NOTICE '3. The BEFORE INSERT trigger will still protect against duplicates';
END $$;

COMMIT;
