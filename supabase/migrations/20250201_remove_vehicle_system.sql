-- ============================================================================
-- REMOVE VEHICLE ESTIMATION SYSTEM
-- ============================================================================
-- This migration removes the vehicle estimation dependency and simplifies
-- delivery fees to be zone-based only (Zone A and Zone B per supplier).
-- Suppliers handle their own logistics, so vehicle selection is unnecessary.
-- ============================================================================

-- ============================================================================
-- STEP 1: Modify supplier_zone_fees table
-- ============================================================================

-- Drop existing constraints and indexes
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_vehicle_class_id_fkey;
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_supplier_id_zone_vehicle_class_id_key;

-- Remove vehicle_class_id column
ALTER TABLE supplier_zone_fees DROP COLUMN IF EXISTS vehicle_class_id;

-- Add new unique constraint (one fee per supplier per zone) - only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_zone_fees_supplier_zone_unique'
  ) THEN
    ALTER TABLE supplier_zone_fees ADD CONSTRAINT supplier_zone_fees_supplier_zone_unique UNIQUE (supplier_id, zone);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Make vehicle_class_id nullable in orders table
-- ============================================================================

-- Remove NOT NULL constraint if it exists
ALTER TABLE orders ALTER COLUMN vehicle_class_id DROP NOT NULL;

-- Set existing orders to have NULL vehicle_class_id (since we're simplifying)
UPDATE orders SET vehicle_class_id = NULL WHERE vehicle_class_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Create simplified delivery fee calculation function
-- ============================================================================

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

  -- Get delivery fee for this zone
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

-- ============================================================================
-- STEP 4: Add helper comments
-- ============================================================================

COMMENT ON FUNCTION fn_calculate_delivery_fee IS
'Calculates delivery zone and fee based on distance from supplier to delivery location.
Replaces the complex vehicle estimation system with simple zone-based pricing.';

COMMENT ON TABLE supplier_zone_fees IS
'Stores delivery fees per supplier per zone (A or B). Each supplier should have exactly 2 rows.
Vehicle selection is removed - suppliers handle their own logistics.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check supplier_zone_fees structure
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '📋 supplier_zone_fees structure updated (vehicle_class_id removed)';
  RAISE NOTICE '📋 orders.vehicle_class_id now nullable';
  RAISE NOTICE '🔧 New function: fn_calculate_delivery_fee created';
END $$;
