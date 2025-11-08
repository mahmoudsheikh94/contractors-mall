-- ============================================================================
-- HOTFIX: Fix "column reference 'zone' is ambiguous" Error
-- ============================================================================
-- This fixes the fn_calculate_delivery_fee function to properly qualify
-- column names and avoid ambiguity with the RETURNS TABLE column names.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- ============================================================================

-- Drop and recreate the function with the fix
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

-- Add comment
COMMENT ON FUNCTION fn_calculate_delivery_fee IS
'Calculates delivery zone and fee based on distance from supplier to delivery location. Replaces complex vehicle estimation.';

-- Test the function (optional - uncomment to test)
-- SELECT * FROM fn_calculate_delivery_fee(
--   'your-supplier-uuid-here',
--   31.9539,  -- Example: Amman latitude
--   35.9106   -- Example: Amman longitude
-- );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Hotfix applied successfully!';
  RAISE NOTICE '🔧 fn_calculate_delivery_fee now uses qualified column names';
  RAISE NOTICE '📝 The "column reference zone is ambiguous" error should be fixed';
END $$;
