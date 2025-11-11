-- ============================================================================
-- FIX: Remove circular recursion in supplier profile viewing policy
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Fix infinite recursion error using SECURITY DEFINER function
-- Solution: Create a helper function that bypasses RLS to check user role
-- ============================================================================

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Suppliers can view contractors for their orders" ON profiles;

-- Create a helper function that bypasses RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_supplier_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'supplier_admin'
  );
$$;

-- Create policy using the helper function (no recursion!)
CREATE POLICY "Supplier admins can view all profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_supplier_admin());

COMMENT ON FUNCTION is_supplier_admin IS
'Security definer function to check if current user is a supplier admin without RLS recursion';

COMMENT ON POLICY "Supplier admins can view all profiles" ON profiles IS
'Allows supplier admins to view all user profiles for order management';
