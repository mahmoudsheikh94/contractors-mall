-- DEFINITIVE FIX FOR RLS INFINITE RECURSION
-- Run this in Supabase SQL Editor NOW

-- Step 1: Completely disable RLS on profiles temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS with ONLY the simplest possible policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create only ONE policy that allows everything for authenticated users on their own profile
CREATE POLICY "users_own_profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 5: Service role bypass (needed for triggers and server-side operations)
CREATE POLICY "service_bypass"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- That's it! These two simple policies should work without recursion.