-- Migration: Fix RLS policies for profiles table
-- This fixes the "new row violates row-level security policy" error

-- 1. First ensure email column exists (safe to run multiple times)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 3. Create improved RLS policies

-- Policy for authenticated users to create their own profile
-- This is more permissive during creation to avoid timing issues
CREATE POLICY "Authenticated users can create their profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for service role (used by server-side operations)
CREATE POLICY "Service role bypass"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Create a function to safely upsert profiles
-- This helps handle race conditions and duplicate attempts
CREATE OR REPLACE FUNCTION upsert_profile(
  user_id UUID,
  user_email TEXT,
  user_phone TEXT,
  user_full_name TEXT,
  user_role user_role,
  user_language language
) RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY
  INSERT INTO profiles (
    id,
    email,
    phone,
    full_name,
    role,
    preferred_language,
    is_active
  ) VALUES (
    user_id,
    user_email,
    user_phone,
    user_full_name,
    user_role,
    user_language,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW()
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_profile TO authenticated;

-- 5. Add a helper function to check if profile exists
CREATE OR REPLACE FUNCTION profile_exists(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION profile_exists TO authenticated;

-- 6. Add trigger to auto-create profile on user signup (optional but helpful)
-- This ensures a profile is created even if the app flow fails
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    INSERT INTO profiles (id, email, phone, full_name, role, preferred_language, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.phone,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'contractor'),
      COALESCE((NEW.raw_user_meta_data->>'preferred_language')::language, 'ar'),
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
-- Note: This trigger is optional and can be commented out if you prefer manual profile creation
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Add helpful comments
COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN profiles.email IS 'User email from auth.users';
COMMENT ON COLUMN profiles.phone IS 'User phone number for SMS auth';
COMMENT ON COLUMN profiles.role IS 'User role: contractor, supplier_admin, driver, or admin';
COMMENT ON FUNCTION upsert_profile IS 'Safely create or update a user profile, handling duplicates gracefully';
COMMENT ON FUNCTION profile_exists IS 'Check if a profile exists for a given user ID';