-- ==========================================
-- VEHICLE ESTIMATION FUNCTION
-- ==========================================
-- Calculates the appropriate vehicle class and delivery fee based on:
-- 1. Total weight, volume, and max length of items
-- 2. Distance-based zone (A or B) using PostGIS
-- 3. +10% safety margin on capacity
-- Returns: vehicle_class_id, zone, delivery_fee_jod, capacity_headroom

CREATE OR REPLACE FUNCTION fn_estimate_vehicle(
  p_supplier_id UUID,
  p_delivery_lat NUMERIC,
  p_delivery_lng NUMERIC,
  p_items_json JSONB
)
RETURNS TABLE (
  vehicle_class_id UUID,
  vehicle_name_ar TEXT,
  vehicle_name_en TEXT,
  zone delivery_zone,
  delivery_fee_jod NUMERIC,
  capacity_headroom JSONB,
  distance_km NUMERIC
) AS $$
DECLARE
  v_supplier_location GEOGRAPHY;
  v_delivery_location GEOGRAPHY;
  v_distance_km NUMERIC;
  v_zone delivery_zone;
  v_total_weight NUMERIC := 0;
  v_total_volume NUMERIC := 0;
  v_max_length NUMERIC := 0;
  v_requires_open_bed BOOLEAN := false;
  v_item JSONB;
  v_safety_margin NUMERIC;
  v_radius_zone_a NUMERIC;
  v_radius_zone_b NUMERIC;
BEGIN
  -- Get safety margin from settings (default 10%)
  SELECT COALESCE((value->>'safety_margin_percent')::NUMERIC, 10) / 100
  INTO v_safety_margin
  FROM settings
  WHERE key = 'delivery_settings';

  IF v_safety_margin IS NULL THEN
    v_safety_margin := 0.1; -- Default 10%
  END IF;

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
  WHERE id = p_supplier_id;

  IF v_supplier_location IS NULL THEN
    RAISE EXCEPTION 'Supplier not found: %', p_supplier_id;
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
    RAISE EXCEPTION 'Delivery location outside service area. Distance: % km', v_distance_km;
  END IF;

  -- Calculate totals from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_json)
  LOOP
    v_total_weight := v_total_weight + COALESCE((v_item->>'weight_kg')::NUMERIC, 0);
    v_total_volume := v_total_volume + COALESCE((v_item->>'volume_m3')::NUMERIC, 0);
    v_max_length := GREATEST(v_max_length, COALESCE((v_item->>'length_m')::NUMERIC, 0));
    v_requires_open_bed := v_requires_open_bed OR COALESCE((v_item->>'requires_open_bed')::BOOLEAN, false);
  END LOOP;

  -- Apply safety margin
  v_total_weight := v_total_weight * (1 + v_safety_margin);
  v_total_volume := v_total_volume * (1 + v_safety_margin);

  -- Select appropriate vehicle and fee
  RETURN QUERY
  SELECT
    v.id as vehicle_class_id,
    v.name_ar,
    v.name_en,
    v_zone as zone,
    szf.base_fee_jod as delivery_fee_jod,
    jsonb_build_object(
      'weight_utilization', ROUND((v_total_weight / v.max_weight_kg * 100)::NUMERIC, 2),
      'volume_utilization', ROUND((v_total_volume / v.max_volume_m3 * 100)::NUMERIC, 2),
      'length_ok', v_max_length <= v.max_length_m,
      'open_bed_ok', NOT v_requires_open_bed OR v.has_open_bed
    ) as capacity_headroom,
    ROUND(v_distance_km::NUMERIC, 2) as distance_km
  FROM vehicles v
  JOIN supplier_zone_fees szf ON szf.vehicle_class_id = v.id
  WHERE
    szf.supplier_id = p_supplier_id
    AND szf.zone = v_zone
    AND v.is_active = true
    AND v.max_weight_kg >= v_total_weight
    AND v.max_volume_m3 >= v_total_volume
    AND v.max_length_m >= v_max_length
    AND (NOT v_requires_open_bed OR v.has_open_bed = true)
  ORDER BY
    v.display_order ASC,
    v.max_weight_kg ASC  -- Choose smallest suitable vehicle
  LIMIT 1;

  -- Check if no vehicle found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No suitable vehicle found for items. Weight: %kg, Volume: %m³, Length: %m, Open bed: %',
      v_total_weight, v_total_volume, v_max_length, v_requires_open_bed;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VISIBLE SUPPLIERS FUNCTION
-- ==========================================
-- Returns suppliers that can deliver to a given location
-- Optionally filtered by category

CREATE OR REPLACE FUNCTION fn_visible_suppliers(
  p_delivery_lat NUMERIC,
  p_delivery_lng NUMERIC,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  supplier_id UUID,
  business_name TEXT,
  business_name_en TEXT,
  distance_km NUMERIC,
  zone delivery_zone,
  min_delivery_fee NUMERIC,
  rating_average NUMERIC,
  rating_count INTEGER,
  products_count BIGINT
) AS $$
DECLARE
  v_delivery_location GEOGRAPHY;
BEGIN
  -- Create delivery location point
  v_delivery_location := ST_SetSRID(ST_MakePoint(p_delivery_lng, p_delivery_lat), 4326)::GEOGRAPHY;

  RETURN QUERY
  WITH supplier_distances AS (
    SELECT
      s.id,
      s.business_name,
      s.business_name_en,
      s.rating_average,
      s.rating_count,
      ST_Distance(s.location, v_delivery_location) / 1000 AS distance_km,
      s.radius_km_zone_a,
      s.radius_km_zone_b,
      CASE
        WHEN ST_Distance(s.location, v_delivery_location) / 1000 <= s.radius_km_zone_a THEN 'zone_a'::delivery_zone
        WHEN ST_Distance(s.location, v_delivery_location) / 1000 <= s.radius_km_zone_b THEN 'zone_b'::delivery_zone
        ELSE NULL
      END AS delivery_zone
    FROM suppliers s
    WHERE s.is_verified = true
      AND ST_Distance(s.location, v_delivery_location) / 1000 <= s.radius_km_zone_b
  ),
  supplier_fees AS (
    SELECT
      sd.*,
      MIN(szf.base_fee_jod) AS min_delivery_fee
    FROM supplier_distances sd
    JOIN supplier_zone_fees szf ON szf.supplier_id = sd.id AND szf.zone = sd.delivery_zone
    GROUP BY sd.id, sd.business_name, sd.business_name_en, sd.rating_average,
             sd.rating_count, sd.distance_km, sd.radius_km_zone_a,
             sd.radius_km_zone_b, sd.delivery_zone
  ),
  supplier_products AS (
    SELECT
      sf.*,
      COUNT(DISTINCT p.id) AS products_count
    FROM supplier_fees sf
    LEFT JOIN products p ON p.supplier_id = sf.id
      AND p.is_available = true
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
    GROUP BY sf.id, sf.business_name, sf.business_name_en, sf.rating_average,
             sf.rating_count, sf.distance_km, sf.radius_km_zone_a,
             sf.radius_km_zone_b, sf.delivery_zone, sf.min_delivery_fee
  )
  SELECT
    sp.id AS supplier_id,
    sp.business_name,
    sp.business_name_en,
    ROUND(sp.distance_km::NUMERIC, 2) AS distance_km,
    sp.delivery_zone AS zone,
    sp.min_delivery_fee,
    sp.rating_average,
    sp.rating_count,
    sp.products_count
  FROM supplier_products sp
  WHERE sp.delivery_zone IS NOT NULL
    AND (p_category_id IS NULL OR sp.products_count > 0)
  ORDER BY sp.distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ORDER NUMBER GENERATION FUNCTION
-- ==========================================
-- Generates unique order numbers in format: ORD-YYYYMMDD-XXXXX

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_order_number TEXT;
BEGIN
  v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get the next sequence number for today
  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 13 FOR 5)::INTEGER), 0) + 1
  INTO v_sequence
  FROM orders
  WHERE order_number LIKE 'ORD-' || v_date_part || '-%';

  v_order_number := 'ORD-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 5, '0');

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- UPDATE SUPPLIER RATING FUNCTION
-- ==========================================
-- Updates supplier rating average when new review is added

CREATE OR REPLACE FUNCTION update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers
  SET
    rating_average = (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM reviews
      WHERE supplier_id = NEW.supplier_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE supplier_id = NEW.supplier_id
    )
  WHERE id = NEW.supplier_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_supplier_rating_trigger ON reviews;
CREATE TRIGGER update_supplier_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_supplier_rating();

-- ==========================================
-- CHECK DELIVERY APPROVAL THRESHOLD FUNCTION
-- ==========================================
-- Returns the approval method based on order total

CREATE OR REPLACE FUNCTION get_delivery_approval_method(p_order_total NUMERIC)
RETURNS TEXT AS $$
DECLARE
  v_photo_threshold NUMERIC;
BEGIN
  -- Get photo threshold from settings
  SELECT COALESCE((value->>'photo_threshold_jod')::NUMERIC, 120)
  INTO v_photo_threshold
  FROM settings
  WHERE key = 'delivery_settings';

  IF v_photo_threshold IS NULL THEN
    v_photo_threshold := 120; -- Default
  END IF;

  IF p_order_total < v_photo_threshold THEN
    RETURN 'photo';
  ELSE
    RETURN 'pin';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- CHECK SITE VISIT REQUIREMENT FUNCTION
-- ==========================================
-- Returns whether site visit is required for dispute

CREATE OR REPLACE FUNCTION check_site_visit_requirement(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_order_total NUMERIC;
  v_site_visit_threshold NUMERIC;
BEGIN
  -- Get order total
  SELECT total_jod INTO v_order_total
  FROM orders
  WHERE id = p_order_id;

  -- Get site visit threshold from settings
  SELECT COALESCE((value->>'site_visit_threshold_jod')::NUMERIC, 350)
  INTO v_site_visit_threshold
  FROM settings
  WHERE key = 'dispute_settings';

  IF v_site_visit_threshold IS NULL THEN
    v_site_visit_threshold := 350; -- Default
  END IF;

  RETURN v_order_total >= v_site_visit_threshold;
END;
$$ LANGUAGE plpgsql;