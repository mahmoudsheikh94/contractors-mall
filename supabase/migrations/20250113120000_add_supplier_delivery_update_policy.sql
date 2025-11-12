-- ============================================
-- Add Supplier UPDATE Policy for Deliveries
-- Date: January 13, 2025
-- Purpose: Allow suppliers to update delivery confirmation fields
-- ============================================
--
-- PROBLEM:
-- Suppliers could view deliveries but couldn't update them for confirmation.
-- Photo uploads to storage worked, but the database update failed due to missing RLS policy.
--
-- SOLUTION:
-- Add UPDATE policy allowing suppliers to update delivery confirmation fields
-- for their own orders only.
--
-- SECURITY:
-- - Suppliers can only update deliveries for orders they own
-- - Join through: deliveries → orders → suppliers → owner_id = auth.uid()
-- - Application controls which specific fields are updated
-- - Trigger validates confirmation sequence (supplier must confirm before contractor)
-- ============================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Suppliers can update delivery confirmation" ON deliveries;

-- Create UPDATE policy for suppliers
CREATE POLICY "Suppliers can update delivery confirmation"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the authenticated user owns the supplier who owns the order
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = deliveries.order_id
      AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for the new values
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = deliveries.order_id
      AND s.owner_id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON POLICY "Suppliers can update delivery confirmation" ON deliveries IS
  'Allows suppliers to update delivery confirmation fields (photo_url, pin_verified_at, supplier_confirmed, etc.) for their own orders. Does not restrict specific fields - application logic controls what gets updated. Security via orders → suppliers → owner_id join.';

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if the policy was created
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'deliveries'
        AND policyname = 'Suppliers can update delivery confirmation'
    ) INTO policy_exists;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Policy created: %', policy_exists;
    RAISE NOTICE '===========================================';

    IF policy_exists THEN
        RAISE NOTICE '✅ Supplier delivery UPDATE policy added successfully!';
        RAISE NOTICE 'Suppliers can now update delivery confirmation fields for their orders.';
    ELSE
        RAISE WARNING '⚠️  Policy creation may have failed. Please verify manually.';
    END IF;
END$$;
