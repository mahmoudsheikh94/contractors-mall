-- ============================================
-- FIX: Trigger with Proper Role Type Casting
-- Run this to fix the type mismatch issue
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
  v_role_enum user_role;  -- Use the actual enum type
BEGIN
  -- Get role from metadata or default to supplier_admin
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'supplier_admin');

  -- Validate and cast to enum
  CASE v_role
    WHEN 'admin' THEN v_role_enum := 'admin'::user_role;
    WHEN 'supplier_admin' THEN v_role_enum := 'supplier_admin'::user_role;
    WHEN 'contractor' THEN v_role_enum := 'contractor'::user_role;
    WHEN 'driver' THEN v_role_enum := 'driver'::user_role;
    ELSE v_role_enum := 'supplier_admin'::user_role;  -- Default
  END CASE;

  -- Create profile with proper type casting
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
    v_role_enum,  -- Use the enum value
    NEW.email_confirmed_at IS NOT NULL,
    NEW.email_confirmed_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the specific error
    RAISE WARNING 'Profile creation failed for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Test it by creating a new user
SELECT 'Trigger function updated successfully!' as status;
