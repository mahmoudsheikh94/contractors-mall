-- ============================================
-- Add Contractor UPDATE Policy for Deliveries
-- Date: January 13, 2025
-- Purpose: Allow contractors to update delivery confirmation fields
-- ============================================
--
-- PROBLEM:
-- Contractors could not confirm delivery receipt because there was no RLS policy
-- allowing them to update the deliveries table. The API uses anon key (not service role),
-- so it respects RLS. Only supplier UPDATE policy existed.
--
-- SOLUTION:
-- Add UPDATE policy allowing contractors to update delivery confirmation fields
-- for their own orders only.
--
-- SECURITY:
-- - Contractors can only update deliveries for orders they own
-- - Check: deliveries → orders → contractor_id = auth.uid()
-- - Application controls which specific fields are updated (contractor_confirmed, etc.)
-- - Trigger validates confirmation sequence (supplier must confirm before contractor)
-- ============================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Contractors can update delivery confirmation" ON deliveries;

-- Create UPDATE policy for contractors
CREATE POLICY "Contractors can update delivery confirmation"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the authenticated user is the contractor who owns the order
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = deliveries.order_id
      AND o.contractor_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for the new values
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = deliveries.order_id
      AND o.contractor_id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON POLICY "Contractors can update delivery confirmation" ON deliveries IS
  'Allows contractors to update delivery confirmation fields (contractor_confirmed, contractor_confirmed_at, etc.) for their own orders. ' ||
  'Does not restrict specific fields - application logic controls what gets updated. ' ||
  'Security via deliveries → orders → contractor_id = auth.uid() check.';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'deliveries'
  AND cmd = 'UPDATE'
ORDER BY policyname;
