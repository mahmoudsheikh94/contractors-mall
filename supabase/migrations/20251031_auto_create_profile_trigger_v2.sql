-- ============================================
-- Auto-Create Profile Trigger (Cloud Compatible)
-- Date: 2025-10-31
-- Purpose: Automatically create profile when user signs up
-- ============================================

-- First, create the function in public schema
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

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Now create the trigger
-- Drop existing trigger first if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates profile when new user signs up. Handles email verification status.';
