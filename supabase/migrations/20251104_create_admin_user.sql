-- ============================================
-- Create Admin User for Testing
-- Date: 2025-11-04
-- Purpose: Create a test admin user to access the admin dashboard
-- ============================================

-- Note: This migration creates a profile for an admin user
-- You'll need to create the actual auth user in Supabase dashboard manually
-- or use the Supabase auth API

-- Instructions:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" and create a user with:
--    Email: admin@contractorsmall.com
--    Password: (your choice, minimum 8 characters)
-- 3. Copy the user ID from the created user
-- 4. Update the id in the INSERT statement below
-- 5. Run this migration

-- Create admin profile (replace the UUID with actual user ID from Supabase Auth)
-- Example INSERT - Replace 'YOUR-AUTH-USER-UUID-HERE' with the actual UUID:

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if we can find an existing user with admin email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@contractorsmall.com'
  LIMIT 1;

  -- If admin user exists in auth.users, create/update their profile
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, phone, role, email_verified, email_verified_at, created_at, updated_at)
    VALUES (
      admin_user_id,
      'admin@contractorsmall.com',
      'Admin User',
      '+962700000000',
      'admin',
      true,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      full_name = 'Admin User',
      email_verified = true,
      updated_at = NOW();

    RAISE NOTICE 'Admin profile created/updated for user ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'No auth user found with email admin@contractorsmall.com';
    RAISE NOTICE 'Please create the user in Supabase Auth Dashboard first:';
    RAISE NOTICE '1. Go to Authentication → Users';
    RAISE NOTICE '2. Add user with email: admin@contractorsmall.com';
    RAISE NOTICE '3. Then run this migration again';
  END IF;
END $$;
