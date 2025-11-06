-- ============================================
-- FINAL FIX: Complete Trigger with Type Casting
-- This includes the trigger recreation as well
-- ============================================

-- Drop the existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the function with proper type handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
  v_role_enum user_role;
BEGIN
  -- Get role from metadata
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'supplier_admin');

  -- Cast to enum with validation
  CASE v_role
    WHEN 'admin' THEN v_role_enum := 'admin'::user_role;
    WHEN 'supplier_admin' THEN v_role_enum := 'supplier_admin'::user_role;
    WHEN 'contractor' THEN v_role_enum := 'contractor'::user_role;
    WHEN 'driver' THEN v_role_enum := 'driver'::user_role;
    ELSE v_role_enum := 'supplier_admin'::user_role;
  END CASE;

  -- Insert profile
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
    v_role_enum,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.email_confirmed_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Enhanced error logging
    RAISE WARNING 'handle_new_user failed for % (role=%): % [%]',
      NEW.id, v_role, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Grant all necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify it was created
SELECT
    'SUCCESS: Trigger created' as status,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verify function exists
SELECT
    'SUCCESS: Function created' as status,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'handle_new_user';
