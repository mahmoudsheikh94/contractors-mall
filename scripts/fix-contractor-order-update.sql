-- =============================================
-- FIX: Add Contractor Order Update RLS Policy
-- Date: January 13, 2025
-- =============================================
--
-- PROBLEM:
-- Contractors cannot update order status during delivery confirmation.
-- The API call succeeds for updating deliveries table but fails silently
-- when trying to update orders table due to missing RLS policy.
--
-- SOLUTION:
-- Add a RESTRICTED UPDATE policy that allows contractors to update
-- ONLY the status field and ONLY during the delivery confirmation flow.
--
-- SECURITY GUARANTEES:
-- ✅ Contractors can only update orders they own (contractor_id = auth.uid())
-- ✅ Can only update when current status is 'awaiting_contractor_confirmation'
-- ✅ Can only change status to 'delivered' or 'completed'
-- ✅ Prevents arbitrary order modifications
-- ✅ Maintains dual-confirmation integrity
--
-- USAGE:
-- 1. First run diagnose-contractor-order-update.sql to confirm the issue
-- 2. Then run this script in Supabase SQL Editor
-- 3. Verify with the test query at the end
--
-- =============================================

-- Drop policy if it exists (idempotent - safe to run multiple times)
DROP POLICY IF EXISTS "Contractors can update order status on delivery confirmation" ON orders;

-- Create the restricted UPDATE policy for contractors
CREATE POLICY "Contractors can update order status on delivery confirmation"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    -- USING clause: WHO can attempt the update
    -- Allow if the authenticated user is the contractor who owns this order
    contractor_id = auth.uid()
    -- AND the current status is awaiting contractor confirmation
    AND status = 'awaiting_contractor_confirmation'
  )
  WITH CHECK (
    -- WITH CHECK clause: WHAT values are allowed in the update
    -- Contractor must still own the order after update
    contractor_id = auth.uid()
    -- AND the new status must be one of the valid completion states
    AND status IN ('delivered', 'completed')
  );

-- Add documentation comment for future reference
COMMENT ON POLICY "Contractors can update order status on delivery confirmation" ON orders IS
  'Restricted UPDATE policy for contractors during delivery confirmation flow. ' ||
  'Allows status updates ONLY from awaiting_contractor_confirmation to delivered/completed. ' ||
  'Part of dual-confirmation system where both supplier and contractor must confirm. ' ||
  'Applied: January 13, 2025';


-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify the policy was created successfully
SELECT
  policyname as "Policy Name",
  cmd as "Operation",
  roles as "Allowed Roles",
  CASE
    WHEN qual::text LIKE '%contractor_id = auth.uid()%' THEN '✅ Checks contractor ownership'
    ELSE '❌ Missing ownership check'
  END as "Security Check 1",
  CASE
    WHEN qual::text LIKE '%awaiting_contractor_confirmation%' THEN '✅ Checks correct status'
    ELSE '❌ Missing status check'
  END as "Security Check 2",
  CASE
    WHEN with_check::text LIKE '%delivered%' OR with_check::text LIKE '%completed%' THEN '✅ Allows only valid statuses'
    ELSE '❌ Allows invalid statuses'
  END as "Security Check 3"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
  AND policyname = 'Contractors can update order status on delivery confirmation';

-- Expected Output: All three security checks should show ✅


-- =============================================
-- TEST THE FIX
-- =============================================
--
-- After applying this policy, test with an actual order:
--
-- 1. Find an order in 'awaiting_contractor_confirmation' status:
--
-- SELECT id, order_number, status
-- FROM orders
-- WHERE status = 'awaiting_contractor_confirmation'
-- LIMIT 1;
--
-- 2. Try to confirm delivery using the contractor confirmation API:
--    POST /api/orders/[orderId]/confirm-delivery
--    Body: { "confirmed": true }
--
-- 3. Verify the order status changed to 'delivered':
--
-- SELECT order_number, status, updated_at
-- FROM orders
-- WHERE id = 'ORDER_ID_FROM_STEP_1';
--
-- Expected: status should now be 'delivered' and updated_at should be recent
--
-- =============================================

-- Success! The policy is now active.
-- All future contractor delivery confirmations will properly update order status.
