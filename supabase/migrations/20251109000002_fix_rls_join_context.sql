-- ============================================================================
-- FIX: RLS Policy Not Working in Foreign Key JOIN Context
-- ============================================================================
-- Date: 2025-11-09
-- Issue: profiles field returns NULL in orders join despite direct access working
-- Root Cause: is_supplier_admin() policy doesn't evaluate correctly in JOINs
-- Solution: Add explicit policy for contractor profiles + allow own profile
-- ============================================================================

-- Drop the current policy that doesn't work in JOINs
DROP POLICY IF EXISTS "Supplier admins can view all profiles" ON profiles;

-- Create a simple policy that works in JOIN context WITHOUT recursion
CREATE POLICY "Users can view relevant profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always view their own profile
  id = auth.uid()
  OR
  -- Contractor profiles are visible to everyone authenticated
  -- (needed for order display in supplier dashboard)
  role = 'contractor'
  OR
  -- Supplier admins can view all profiles
  -- (Uses SECURITY DEFINER function - no recursion!)
  is_supplier_admin()
);

COMMENT ON POLICY "Users can view relevant profiles" ON profiles IS
'Allows users to view their own profile, contractor profiles (for orders), and supplier admins/admins can view all profiles';

-- Verify the policy works
-- Run these queries in Supabase Dashboard to test:
--
-- Test 1: Direct profile access
-- SELECT id, full_name, role FROM profiles WHERE role = 'contractor' LIMIT 3;
--
-- Test 2: JOIN context (the failing case)
-- SELECT o.order_number, p.full_name
-- FROM orders o
-- LEFT JOIN profiles p ON p.id = o.contractor_id
-- WHERE o.supplier_id = (SELECT id FROM suppliers WHERE business_name ILIKE '%جلفار%' LIMIT 1)
-- LIMIT 5;
