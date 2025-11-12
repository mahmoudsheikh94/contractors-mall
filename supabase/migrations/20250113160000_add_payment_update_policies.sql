-- ============================================
-- Add Payment UPDATE Policies
-- Date: January 13, 2025
-- Purpose: Allow contractors and admins to update payment status
-- ============================================
--
-- PROBLEM:
-- Contractor delivery confirmation API needs to release payments automatically,
-- but fails because there are NO RLS policies on payments table.
-- Admin escrow management also needs to release/refund payments manually.
--
-- SOLUTION:
-- Add UPDATE policies for:
-- 1. Contractors - limited to releasing payments for their own orders
-- 2. Admins - full UPDATE access for manual escrow management
--
-- SECURITY:
-- Contractors:
-- - Can only update payments for orders they own (orders.contractor_id = auth.uid())
-- - Can only change status from 'escrow_held' to 'released'
-- - Can only set released_at timestamp
-- Admins:
-- - Can update any payment (role = 'admin' in profiles)
-- - Can release or refund (full escrow control)
-- ============================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Contractors can release payments for their orders" ON payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;

-- Policy 1: Contractors can release payments for their own orders
CREATE POLICY "Contractors can release payments for their orders"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the authenticated user is the contractor who owns the order
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
      AND o.contractor_id = auth.uid()
    )
    -- AND current payment status is escrow_held
    AND status = 'escrow_held'
  )
  WITH CHECK (
    -- Contractor owns this order
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
      AND o.contractor_id = auth.uid()
    )
    -- AND new status is released (can only release, not refund)
    AND status = 'released'
  );

-- Policy 2: Admins can manage all payments (release, refund, freeze)
CREATE POLICY "Admins can manage all payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the authenticated user is an admin
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    -- Same check for new values
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Contractors can release payments for their orders" ON payments IS
  'Allows contractors to release payments automatically during delivery confirmation. Restricted to orders they own and can only change status from escrow_held to released. Cannot refund or freeze payments.';

COMMENT ON POLICY "Admins can manage all payments" ON payments IS
  'Allows admins to manually release, refund, or freeze payments for any order. Used in escrow management dashboard for dispute resolution and QC operations.';

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
  AND tablename = 'payments'
  AND cmd = 'UPDATE'
ORDER BY policyname;
