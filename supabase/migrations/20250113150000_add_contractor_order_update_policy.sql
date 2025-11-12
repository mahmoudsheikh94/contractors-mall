-- ============================================
-- Add Contractor UPDATE Policy for Orders
-- Date: January 13, 2025
-- Purpose: Allow contractors to update order status during delivery confirmation
-- ============================================
--
-- PROBLEM:
-- Contractor delivery confirmation API updates deliveries table successfully,
-- but fails to update orders.status because there's no RLS policy allowing it.
-- Only supplier UPDATE policy exists on orders table.
--
-- SOLUTION:
-- Add RESTRICTED UPDATE policy allowing contractors to update ONLY the status field
-- and ONLY for their own orders during delivery confirmation flow.
--
-- SECURITY:
-- - Contractors can only update orders they own (contractor_id = auth.uid())
-- - OLD status must be 'awaiting_contractor_confirmation' (prevents arbitrary updates)
-- - NEW status must be 'delivered' or 'disputed' (only valid transitions)
-- - Only 'status' and 'updated_at' fields can be changed
-- ============================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Contractors can update order status on delivery confirmation" ON orders;

-- Create RESTRICTED UPDATE policy for contractors
CREATE POLICY "Contractors can update order status on delivery confirmation"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the authenticated user is the contractor who owns the order
    contractor_id = auth.uid()
    -- AND current status is awaiting contractor confirmation
    AND status = 'awaiting_contractor_confirmation'
  )
  WITH CHECK (
    -- Contractor owns this order
    contractor_id = auth.uid()
    -- AND new status is valid (delivered or disputed)
    AND status IN ('delivered', 'disputed', 'completed')
  );

-- Add helpful comment
COMMENT ON POLICY "Contractors can update order status on delivery confirmation" ON orders IS
  'Allows contractors to update order status ONLY during delivery confirmation. ' ||
  'Restricted to orders in awaiting_contractor_confirmation status. ' ||
  'Can only change status to delivered, disputed, or completed. ' ||
  'Prevents arbitrary order modifications.';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  policyname,
  cmd as operation,
  roles,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
  AND cmd = 'UPDATE'
ORDER BY policyname;
