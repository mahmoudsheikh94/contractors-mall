-- ============================================
-- MINIMAL TRIGGER CREATION
-- Run this ONLY if the trigger doesn't exist
-- ============================================

-- Step 1: Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DECLARE
    v_role text;
  BEGIN
    -- Get role from metadata or default to supplier_admin
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'supplier_admin');

    -- Validate role
    IF v_role NOT IN ('admin', 'supplier_admin', 'contractor', 'driver') THEN
      v_role := 'supplier_admin';
    END IF;

    -- Create profile
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
      NEW.email_confirmed_at IS NOT NULL,
      NEW.email_confirmed_at,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't block signup
      RAISE WARNING 'Could not auto-create profile for user %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 3: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify it was created
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- You should see 1 row showing the trigger details
-- If you see 0 rows, there's a permission issue preventing trigger creation
