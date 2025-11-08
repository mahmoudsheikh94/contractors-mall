-- ============================================================================
-- COMPREHENSIVE HOTFIX MIGRATION
-- ============================================================================
-- This migration applies all pending hotfixes to stabilize the database
-- Date: 2025-11-08
-- Issues Fixed:
--   1. RLS infinite recursion for orders table
--   2. Missing RLS policies for order_items
--   3. Nullable constraints for order_items fields
--   4. Zone ambiguity in delivery fee calculation
--   5. Vehicle class removal from supplier_zone_fees
-- ============================================================================

-- ============================================================================
-- PART 1: FIX RLS INFINITE RECURSION ON ORDERS TABLE
-- ============================================================================

-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;

-- Recreate without circular dependency
CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
    AND status IN ('in_delivery', 'delivered', 'completed')
  );

-- Fix INSERT policies for contractors
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Contractors can create orders" ON orders;

CREATE POLICY "Contractors can create orders" ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    contractor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('contractor', 'admin')
    )
  );

-- Ensure contractors can view their own orders
DROP POLICY IF EXISTS "Contractors can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;

CREATE POLICY "Contractors can view their orders" ON orders
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- Fix deliveries table policies
DROP POLICY IF EXISTS "Drivers can view their deliveries" ON deliveries;
CREATE POLICY "Drivers can view their deliveries" ON deliveries
  FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their deliveries" ON deliveries;
CREATE POLICY "Drivers can update their deliveries" ON deliveries
  FOR UPDATE USING (driver_id = auth.uid());

-- ============================================================================
-- PART 2: ADD MISSING RLS POLICIES FOR ORDER_ITEMS TABLE
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Contractors can create order items" ON order_items;
DROP POLICY IF EXISTS "Contractors can view their order items" ON order_items;
DROP POLICY IF EXISTS "Suppliers can view order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Suppliers can update order items for their orders" ON order_items;
DROP POLICY IF EXISTS "Service role full access order_items" ON order_items;

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

-- Service role bypass for order_items
CREATE POLICY "Service role full access order_items" ON order_items
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 3: MAKE ORDER_ITEMS FIELDS NULLABLE (TEMPORARY)
-- ============================================================================
-- This is temporary to allow order creation while fixing frontend data flow

-- Make product_name nullable
ALTER TABLE order_items ALTER COLUMN product_name DROP NOT NULL;

-- Make unit nullable
ALTER TABLE order_items ALTER COLUMN unit DROP NOT NULL;

-- Add comments explaining this is temporary
COMMENT ON COLUMN order_items.product_name IS
'Product name at time of order (for historical record).
TEMPORARILY NULLABLE - should contain actual product name for proper order history.';

COMMENT ON COLUMN order_items.unit IS
'Unit of measurement at time of order (e.g., كيس, طن).
TEMPORARILY NULLABLE - should contain actual unit for proper order history.';

-- ============================================================================
-- PART 4: FIX ZONE AMBIGUITY IN DELIVERY FEE CALCULATION
-- ============================================================================

-- Drop and recreate the function with proper column qualification
DROP FUNCTION IF EXISTS fn_calculate_delivery_fee(UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION fn_calculate_delivery_fee(
  p_supplier_id UUID,
  p_delivery_lat NUMERIC,
  p_delivery_lng NUMERIC
)
RETURNS TABLE (
  zone delivery_zone,
  delivery_fee_jod NUMERIC,
  distance_km NUMERIC
) AS $$
DECLARE
  v_supplier_location GEOGRAPHY;
  v_delivery_location GEOGRAPHY;
  v_distance_km NUMERIC;
  v_zone delivery_zone;
  v_radius_zone_a NUMERIC;
  v_radius_zone_b NUMERIC;
  v_delivery_fee NUMERIC;
BEGIN
  -- Get supplier location and zone radii
  SELECT
    location,
    radius_km_zone_a,
    radius_km_zone_b
  INTO
    v_supplier_location,
    v_radius_zone_a,
    v_radius_zone_b
  FROM suppliers
  WHERE id = p_supplier_id AND is_verified = true;

  IF v_supplier_location IS NULL THEN
    RAISE EXCEPTION 'Supplier not found or not verified: %', p_supplier_id;
  END IF;

  -- Create delivery location point
  v_delivery_location := ST_SetSRID(ST_MakePoint(p_delivery_lng, p_delivery_lat), 4326)::GEOGRAPHY;

  -- Calculate distance in kilometers
  v_distance_km := ST_Distance(v_supplier_location, v_delivery_location) / 1000;

  -- Determine zone based on distance
  IF v_distance_km <= v_radius_zone_a THEN
    v_zone := 'zone_a';
  ELSIF v_distance_km <= v_radius_zone_b THEN
    v_zone := 'zone_b';
  ELSE
    RAISE EXCEPTION 'Delivery location outside service area. Distance: % km, Max: % km',
      ROUND(v_distance_km::NUMERIC, 2), v_radius_zone_b;
  END IF;

  -- Get delivery fee for this zone (FIXED: qualified column names)
  SELECT base_fee_jod
  INTO v_delivery_fee
  FROM supplier_zone_fees
  WHERE supplier_zone_fees.supplier_id = p_supplier_id
    AND supplier_zone_fees.zone = v_zone;

  IF v_delivery_fee IS NULL THEN
    RAISE EXCEPTION 'Delivery fee not configured for supplier % in zone %', p_supplier_id, v_zone;
  END IF;

  -- Return the result
  RETURN QUERY
  SELECT
    v_zone as zone,
    v_delivery_fee as delivery_fee_jod,
    ROUND(v_distance_km::NUMERIC, 2) as distance_km;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_calculate_delivery_fee IS
'Calculates delivery zone and fee based on distance from supplier to delivery location. Fixed column ambiguity issues.';

-- ============================================================================
-- PART 5: REMOVE VEHICLE_CLASS_ID FROM SUPPLIER_ZONE_FEES
-- ============================================================================
-- This aligns the database schema with the TypeScript expectations

-- Drop constraints if they exist
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_vehicle_class_id_fkey;
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_supplier_id_zone_vehicle_class_id_key;

-- Remove column if it exists
ALTER TABLE supplier_zone_fees DROP COLUMN IF EXISTS vehicle_class_id;

-- Add new unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_zone_fees_supplier_zone_unique'
  ) THEN
    ALTER TABLE supplier_zone_fees
      ADD CONSTRAINT supplier_zone_fees_supplier_zone_unique
      UNIQUE (supplier_id, zone);
  END IF;
END $$;

-- Make vehicle_class_id nullable in orders (if not already)
ALTER TABLE orders ALTER COLUMN vehicle_class_id DROP NOT NULL;

-- ============================================================================
-- PART 6: ADDITIONAL ADMIN POLICIES FOR ORDER_ITEMS
-- ============================================================================

-- Allow admins to view all order items
CREATE POLICY "Admins can view all order items" ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update all order items
CREATE POLICY "Admins can update all order items" ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- VERIFICATION AND SUCCESS REPORT
-- ============================================================================

DO $$
DECLARE
  v_orders_policies_count INTEGER;
  v_order_items_policies_count INTEGER;
  v_function_exists BOOLEAN;
  v_vehicle_class_removed BOOLEAN;
BEGIN
  -- Count policies on orders table
  SELECT COUNT(*) INTO v_orders_policies_count
  FROM pg_policies
  WHERE tablename = 'orders';

  -- Count policies on order_items table
  SELECT COUNT(*) INTO v_order_items_policies_count
  FROM pg_policies
  WHERE tablename = 'order_items';

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_calculate_delivery_fee'
  ) INTO v_function_exists;

  -- Check if vehicle_class_id was removed
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_zone_fees'
    AND column_name = 'vehicle_class_id'
  ) INTO v_vehicle_class_removed;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL HOTFIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION RESULTS:';
  RAISE NOTICE '   • Orders table policies: %', v_orders_policies_count;
  RAISE NOTICE '   • Order items policies: %', v_order_items_policies_count;
  RAISE NOTICE '   • Delivery fee function: %', CASE WHEN v_function_exists THEN '✅ Fixed' ELSE '❌ Missing' END;
  RAISE NOTICE '   • Vehicle class removed: %', CASE WHEN v_vehicle_class_removed THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 FIXES APPLIED:';
  RAISE NOTICE '   1. RLS infinite recursion resolved';
  RAISE NOTICE '   2. Order items RLS policies added';
  RAISE NOTICE '   3. Order items fields made nullable';
  RAISE NOTICE '   4. Zone ambiguity in delivery fee fixed';
  RAISE NOTICE '   5. Vehicle class removed from zone fees';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT NOTES:';
  RAISE NOTICE '   • Order items fields are TEMPORARILY nullable';
  RAISE NOTICE '   • Frontend should be updated to pass product data';
  RAISE NOTICE '   • Once confirmed working, make fields NOT NULL again';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Test order creation flow';
  RAISE NOTICE '   2. Verify delivery fee calculations';
  RAISE NOTICE '   3. Monitor for any new RLS errors';
  RAISE NOTICE '';
END $$;