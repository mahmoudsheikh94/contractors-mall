-- ============================================================================
-- EMERGENCY ROLLBACK: Fix Infinite Recursion in Profiles RLS
-- ============================================================================
-- Date: 2025-01-11
-- Author: Claude Code
-- Purpose: Rollback the problematic RLS policy that causes infinite recursion
--
-- Problem: The previous migration created a policy with a subquery that causes
--          infinite recursion: profiles → orders → profiles (circular dependency)
--
-- Solution: Revert to the working policy from 20251109000002_fix_rls_join_context.sql
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;

-- Recreate the WORKING policy (without the recursive subquery)
CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
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

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'EMERGENCY ROLLBACK COMPLETE: Infinite recursion fixed';
END $$;
