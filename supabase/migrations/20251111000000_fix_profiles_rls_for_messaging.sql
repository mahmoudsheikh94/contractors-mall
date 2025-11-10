-- ============================================================================
-- MIGRATION: Fix Profiles RLS for Messaging
-- ============================================================================
-- Date: 2025-01-11
-- Author: Claude Code
-- Purpose: Allow users to view profiles of people they communicate with on orders
--
-- Problem: OrderChat component crashes because RLS prevents contractors from
--          viewing supplier profiles and vice versa. The message.sender join
--          returns null, causing "Cannot read properties of null" errors.
--
-- Solution: Add RLS policy to allow viewing profiles of order participants
-- ============================================================================

-- Drop existing restrictive policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Recreate the self-view policy
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Add new policy: Users can view profiles of order participants
CREATE POLICY "Users can view profiles of order participants"
  ON profiles FOR SELECT
  USING (
    id IN (
      -- Contractors can see supplier owner profiles from their orders
      SELECT s.owner_id
      FROM orders o
      JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.contractor_id = auth.uid()

      UNION

      -- Suppliers can see contractor profiles from their orders
      SELECT o.contractor_id
      FROM orders o
      JOIN suppliers s ON s.id = o.supplier_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Profiles RLS updated for messaging support';
END $$;
