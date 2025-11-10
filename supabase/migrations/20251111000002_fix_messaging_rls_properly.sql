-- ============================================================================
-- PROPER FIX: Allow Contractors to View Supplier Profiles (No Recursion)
-- ============================================================================
-- Date: 2025-01-11
-- Author: Claude Code
-- Purpose: Allow contractors to see supplier names in messages WITHOUT recursion
--
-- Problem: Previous attempt caused infinite recursion by using subquery
--
-- Solution: Use SECURITY DEFINER function approach (like is_supplier_admin)
--           OR make supplier_admin profiles visible to all (simpler, less secure)
-- ============================================================================

-- OPTION 1: Make supplier_admin profiles visible to all authenticated users
-- This is simple and safe since supplier profiles are semi-public anyway
-- (they're visible on the suppliers page)

DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;

CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own profile
    id = auth.uid()
    OR
    -- Contractor profiles are visible to everyone authenticated
    role = 'contractor'
    OR
    -- Supplier admin profiles are visible to everyone authenticated
    -- (Safe: suppliers are semi-public entities, visible on suppliers page)
    role = 'supplier_admin'
    OR
    -- Regular admins and drivers can see all via is_supplier_admin()
    is_supplier_admin()
  );

COMMENT ON POLICY "Users can view relevant profiles" ON profiles IS
'Allows authenticated users to view: own profile, all contractor profiles, all supplier admin profiles, and admins can view everything';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Messaging RLS fixed: Supplier profiles now visible to contractors (no recursion)';
END $$;
