# Apply Vehicle System Removal Migration

## Quick Instructions

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
   - Or navigate to: Project → SQL Editor → New Query

2. **Copy and paste the following SQL**

```sql
-- ============================================================================
-- REMOVE VEHICLE ESTIMATION SYSTEM
-- ============================================================================

-- STEP 1: Modify supplier_zone_fees table
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_vehicle_class_id_fkey;
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_supplier_id_zone_vehicle_class_id_key;
ALTER TABLE supplier_zone_fees DROP COLUMN IF EXISTS vehicle_class_id;
ALTER TABLE supplier_zone_fees ADD CONSTRAINT supplier_zone_fees_supplier_zone_unique UNIQUE (supplier_id, zone);

-- STEP 2: Make vehicle_class_id nullable in orders table
ALTER TABLE orders ALTER COLUMN vehicle_class_id DROP NOT NULL;
UPDATE orders SET vehicle_class_id = NULL WHERE vehicle_class_id IS NOT NULL;

-- STEP 3: Create simplified delivery fee calculation function
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
  WHERE supplier_id = p_supplier_id AND zone = v_zone;

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

-- Add comments
COMMENT ON FUNCTION fn_calculate_delivery_fee IS
'Calculates delivery zone and fee based on distance from supplier to delivery location. Replaces complex vehicle estimation.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📋 supplier_zone_fees now simplified (no vehicle dependency)';
  RAISE NOTICE '📋 orders.vehicle_class_id now nullable';
  RAISE NOTICE '🔧 fn_calculate_delivery_fee function created';
END $$;
```

3. **Click "Run" or press Ctrl/Cmd + Enter**

4. **Verify the migration succeeded**
   - You should see "Migration completed successfully!" in the output
   - No errors should appear

## What This Migration Does

1. **Removes vehicle dependency from supplier_zone_fees**
   - Each supplier now has 2 simple fee records: one for Zone A, one for Zone B
   - No more complex vehicle capacity calculations

2. **Makes vehicle_class_id optional in orders**
   - Existing orders set to NULL
   - New orders won't require vehicle selection

3. **Creates simplified delivery fee function**
   - Calculates zone based on distance
   - Returns the supplier's configured fee for that zone
   - No vehicle estimation needed

## After Migration

You need to ensure each supplier has their zone fees configured:

```sql
-- Check which suppliers need zone fees
SELECT s.id, s.business_name,
  (SELECT COUNT(*) FROM supplier_zone_fees WHERE supplier_id = s.id) as zone_fee_count
FROM suppliers s
WHERE is_verified = true;

-- Add zone fees for a supplier (example)
INSERT INTO supplier_zone_fees (supplier_id, zone, base_fee_jod)
VALUES
  ('SUPPLIER_ID_HERE', 'zone_a', 15.00),
  ('SUPPLIER_ID_HERE', 'zone_b', 30.00);
```

## Troubleshooting

If you get errors about existing constraints:
- The migration is idempotent (safe to run multiple times)
- Just run it again

If you see "Delivery fee not configured" errors when testing:
- Make sure suppliers have zone_a and zone_b fees configured
- Use the SQL above to add missing fees
