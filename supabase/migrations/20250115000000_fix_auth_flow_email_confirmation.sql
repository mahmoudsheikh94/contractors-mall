-- ============================================
-- Fix Authentication Flow for Email Confirmation
-- Date: 2025-01-15
-- Purpose: Ensure profiles can be created by trigger even with email confirmation ON
-- ============================================

BEGIN;

-- The trigger runs with SECURITY DEFINER, so it bypasses RLS
-- But we need to ensure the function can insert into profiles table
-- Grant necessary permissions for the trigger function

GRANT INSERT ON public.profiles TO supabase_auth_admin;

-- Add a comment to document the permission
COMMENT ON TABLE public.profiles IS 'User profiles with automatic creation via auth trigger. Trigger has INSERT permission via supabase_auth_admin role.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Profile INSERT permission granted to auth trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Auth Flow (Email Confirmation ON):';
  RAISE NOTICE '1. User submits signup form';
  RAISE NOTICE '2. Supabase creates auth.users record';
  RAISE NOTICE '3. Trigger automatically creates profile (email_verified=false)';
  RAISE NOTICE '4. User receives verification email from Supabase';
  RAISE NOTICE '5. User clicks link → email_confirmed_at updated';
  RAISE NOTICE '6. Auth callback checks type=signup and sends welcome email';
  RAISE NOTICE '7. User redirected based on role';
END $$;

COMMIT;
