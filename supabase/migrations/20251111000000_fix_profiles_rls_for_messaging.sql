-- ============================================================================
-- MIGRATION: Fix Profiles RLS for Messaging
-- ============================================================================
-- Date: 2025-01-11
-- Author: Claude Code
-- Purpose: Allow contractors to view supplier profiles they communicate with
--
-- Problem: Contractors see "مستخدم غير معروف" for supplier messages because
--          the existing RLS policy "Users can view relevant profiles" doesn't
--          allow contractors to view supplier admin profiles.
--
-- Solution: Update existing policy to add: Contractors can see supplier admin
--           profiles from their orders
-- ============================================================================

-- Drop the existing policy (created in 20251109000002_fix_rls_join_context.sql)
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;

-- Recreate with improved permissions
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
    is_supplier_admin()
    OR
    -- NEW: Contractors can see supplier admin profiles from their orders
    (role = 'supplier_admin' AND id IN (
      SELECT s.owner_id
      FROM orders o
      JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.contractor_id = auth.uid()
    ))
  );

COMMENT ON POLICY "Users can view relevant profiles" ON profiles IS
'Allows users to view their own profile, contractor profiles (for orders), supplier admins can view all profiles, and contractors can view supplier admins from their orders';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Contractors can now see supplier profiles in messages';
END $$;
