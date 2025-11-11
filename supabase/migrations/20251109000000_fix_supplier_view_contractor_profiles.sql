-- ============================================================================
-- FIX: Allow suppliers to view contractor profiles for their orders
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Fix supplier orders page by allowing suppliers to view contractor
--          profiles when joined with their orders
-- Issue: RLS policy on profiles table was blocking the join, causing 0 results
-- ============================================================================

-- Add policy to allow suppliers to view contractor profiles for their orders
CREATE POLICY "Suppliers can view contractors for their orders" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the profile belongs to a contractor who has ordered from this supplier
    id IN (
      SELECT o.contractor_id
      FROM orders o
      JOIN suppliers s ON s.id = o.supplier_id
      WHERE s.owner_id = auth.uid()
    )
  );

COMMENT ON POLICY "Suppliers can view contractors for their orders" ON profiles IS
'Allows suppliers to view basic profile info of contractors who have placed orders with them';
