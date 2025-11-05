-- EMERGENCY FIX: Resolve infinite recursion in RLS policies
-- Run this IMMEDIATELY to fix the "infinite recursion detected" error

-- Step 1: Drop ALL existing policies to clean slate
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role bypass" ON profiles;
DROP POLICY IF EXISTS "Service bypass" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;
DROP POLICY IF EXISTS "Simple insert" ON profiles;
DROP POLICY IF EXISTS "Simple select" ON profiles;
DROP POLICY IF EXISTS "Simple update" ON profiles;

-- Step 2: Create SIMPLE non-recursive policies
-- These policies do NOT check other tables or rows, preventing recursion

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to view their own profile
CREATE POLICY "Allow select own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to delete their own profile (just in case)
CREATE POLICY "Allow delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Service role can bypass all RLS (for server-side operations)
CREATE POLICY "Service role full access"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Ensure we have proper constraints to prevent duplicates at DB level
-- The PRIMARY KEY on id already prevents duplicates, no need for policy checks

-- Step 4: Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Verification query (run this after to check policies)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'profiles';

COMMENT ON TABLE profiles IS 'User profiles with simplified non-recursive RLS policies';