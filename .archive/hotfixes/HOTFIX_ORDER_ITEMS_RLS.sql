-- ============================================================================
-- HOTFIX: Add Missing RLS Policies for order_items Table
-- ============================================================================
-- The order_items table has no RLS policies, causing INSERT failures
-- This adds the necessary policies for contractors and suppliers
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON order_items TABLE
-- ============================================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INSERT POLICIES
-- ============================================================================

-- Allow contractors to create order items for their orders
CREATE POLICY "Contractors can create order items" ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.contractor_id = auth.uid()
    )
  );

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Allow contractors to view their order items
CREATE POLICY "Contractors can view their order items" ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.contractor_id = auth.uid()
    )
  );

-- Allow suppliers to view order items for their orders
CREATE POLICY "Suppliers can view order items for their orders" ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON orders.supplier_id = suppliers.id
      WHERE orders.id = order_items.order_id
      AND suppliers.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Allow suppliers to update order items (e.g., for corrections)
CREATE POLICY "Suppliers can update order items for their orders" ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON orders.supplier_id = suppliers.id
      WHERE orders.id = order_items.order_id
      AND suppliers.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN suppliers ON orders.supplier_id = suppliers.id
      WHERE orders.id = order_items.order_id
      AND suppliers.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- SERVICE ROLE POLICY
-- ============================================================================

-- Service role bypass for order_items
CREATE POLICY "Service role full access order_items" ON order_items
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ORDER_ITEMS RLS POLICIES APPLIED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Added Policies:';
  RAISE NOTICE '   1. Contractors can create order items';
  RAISE NOTICE '   2. Contractors can view their order items';
  RAISE NOTICE '   3. Suppliers can view order items for their orders';
  RAISE NOTICE '   4. Suppliers can update order items for their orders';
  RAISE NOTICE '   5. Service role full access';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 You should now be able to:';
  RAISE NOTICE '   - Create order items when placing an order';
  RAISE NOTICE '   - View order items as a contractor';
  RAISE NOTICE '   - View and manage order items as a supplier';
  RAISE NOTICE '';
END $$;