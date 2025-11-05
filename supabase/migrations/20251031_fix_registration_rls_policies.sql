-- ============================================
-- Fix Registration RLS Policies
-- Date: 2025-10-31
-- Purpose: Add missing INSERT/UPDATE policies for profiles and suppliers
-- ============================================

-- The profiles and suppliers tables have RLS enabled but are missing
-- the INSERT policies that allow users to register and create their accounts.

BEGIN;

-- ==========================================
-- PROFILES TABLE POLICIES
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow users to INSERT their own profile during registration
CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to UPDATE their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- SUPPLIERS TABLE POLICIES
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create supplier for themselves" ON suppliers;
DROP POLICY IF EXISTS "Supplier admins can update their supplier" ON suppliers;

-- Allow users to INSERT supplier record during registration
CREATE POLICY "Users can create supplier for themselves"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Allow supplier admins to UPDATE their supplier record
CREATE POLICY "Supplier admins can update their supplier"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check profiles policies
DO $$
BEGIN
  RAISE NOTICE '=== Profiles Table Policies ===';
END $$;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check suppliers policies
DO $$
BEGIN
  RAISE NOTICE '=== Suppliers Table Policies ===';
END $$;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'suppliers'
ORDER BY policyname;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated successfully!';
  RAISE NOTICE '   - Added INSERT policy for profiles (registration)';
  RAISE NOTICE '   - Added UPDATE policy for profiles (self-update)';
  RAISE NOTICE '   - Added INSERT policy for suppliers (registration)';
  RAISE NOTICE '   - Added UPDATE policy for suppliers (self-update)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Registration should now work!';
  RAISE NOTICE '   Test at: http://localhost:3001/auth/register';
END $$;

COMMIT;
