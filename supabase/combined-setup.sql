-- ==========================================
-- CONTRACTORS MALL - COMPLETE DATABASE SETUP
-- ==========================================
-- This file combines all migrations and seed data
-- Run this in Supabase SQL Editor after creating your project
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom types/enums
CREATE TYPE user_role AS ENUM ('contractor', 'supplier_admin', 'driver', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'in_delivery', 'delivered', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
CREATE TYPE dispute_status AS ENUM ('opened', 'investigating', 'resolved', 'escalated');
CREATE TYPE delivery_zone AS ENUM ('zone_a', 'zone_b');
CREATE TYPE preferred_language AS ENUM ('ar', 'en');

-- ==========================================
-- PART 1: CREATE ALL TABLES
-- ==========================================

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'contractor',
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  preferred_language preferred_language DEFAULT 'ar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- VEHICLES TABLE
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  class_code TEXT UNIQUE NOT NULL,
  max_weight_kg NUMERIC(10,2) NOT NULL,
  max_volume_m3 NUMERIC(10,2) NOT NULL,
  max_length_m NUMERIC(10,2) NOT NULL,
  has_open_bed BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_class_code ON vehicles(class_code);

-- SUPPLIERS TABLE
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  business_name TEXT NOT NULL,
  business_name_en TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
  radius_km_zone_a NUMERIC(5,2) DEFAULT 10,
  radius_km_zone_b NUMERIC(5,2) DEFAULT 25,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  wallet_balance NUMERIC(10,2) DEFAULT 0,
  wallet_pending NUMERIC(10,2) DEFAULT 0,
  wallet_available NUMERIC(10,2) DEFAULT 0,
  rating_average NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_owner ON suppliers(owner_id);
CREATE INDEX idx_suppliers_verified ON suppliers(is_verified);
CREATE INDEX idx_suppliers_location ON suppliers USING GIST(location);

-- SUPPLIER ZONE FEES TABLE
CREATE TABLE supplier_zone_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  zone delivery_zone NOT NULL,
  vehicle_class_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  base_fee_jod NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, zone, vehicle_class_id)
);

CREATE INDEX idx_zone_fees_supplier ON supplier_zone_fees(supplier_id);

-- CATEGORIES TABLE
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- PRODUCTS TABLE
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  unit_ar TEXT NOT NULL,
  unit_en TEXT NOT NULL,
  price_per_unit NUMERIC(10,2) NOT NULL,
  min_order_quantity NUMERIC(10,2) DEFAULT 1,
  weight_kg_per_unit NUMERIC(10,3),
  volume_m3_per_unit NUMERIC(10,6),
  length_m_per_unit NUMERIC(10,3),
  requires_open_bed BOOLEAN DEFAULT false,
  stock_quantity NUMERIC(10,2),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, sku)
);

CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_available ON products(is_available);

-- PROJECTS TABLE
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  budget_estimate NUMERIC(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_contractor ON projects(contractor_id);

-- ORDERS TABLE
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status order_status DEFAULT 'pending',
  subtotal_jod NUMERIC(10,2) NOT NULL,
  delivery_fee_jod NUMERIC(10,2) NOT NULL,
  total_jod NUMERIC(10,2) NOT NULL,
  vehicle_class_id UUID REFERENCES vehicles(id),
  delivery_zone delivery_zone,
  delivery_address TEXT NOT NULL,
  delivery_latitude NUMERIC(10,7) NOT NULL,
  delivery_longitude NUMERIC(10,7) NOT NULL,
  scheduled_delivery_date DATE NOT NULL,
  scheduled_delivery_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_contractor ON orders(contractor_id);
CREATE INDEX idx_orders_supplier ON orders(supplier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_delivery_date ON orders(scheduled_delivery_date);

-- ORDER ITEMS TABLE
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  weight_kg NUMERIC(10,3),
  volume_m3 NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- DELIVERIES TABLE
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_plate_number TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  proof_photo_url TEXT,
  confirmation_pin TEXT,
  pin_verified BOOLEAN DEFAULT false,
  recipient_name TEXT,
  recipient_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);

-- PAYMENTS TABLE
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_intent_id TEXT UNIQUE,
  payment_method TEXT,
  status payment_status DEFAULT 'pending',
  amount_jod NUMERIC(10,2) NOT NULL,
  held_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_intent ON payments(payment_intent_id);

-- PAYMENT EVENTS TABLE
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX idx_payment_events_created ON payment_events(created_at);

-- DISPUTES TABLE
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status dispute_status DEFAULT 'opened',
  reason TEXT NOT NULL,
  description TEXT,
  qc_notes TEXT,
  qc_action TEXT,
  site_visit_required BOOLEAN DEFAULT false,
  site_visit_completed BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_opened_by ON disputes(opened_by);

-- REVIEWS TABLE
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_order ON reviews(order_id);
CREATE INDEX idx_reviews_supplier ON reviews(supplier_id);

-- SETTINGS TABLE
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- MEDIA TABLE
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_entity ON media(entity_type, entity_id);

-- ==========================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_zone_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PART 3: CREATE RLS POLICIES
-- ==========================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SUPPLIERS POLICIES
CREATE POLICY "Public can view verified suppliers" ON suppliers
  FOR SELECT USING (is_verified = true);

CREATE POLICY "Supplier admins can manage their supplier" ON suppliers
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Admins can manage all suppliers" ON suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PRODUCTS POLICIES
CREATE POLICY "Public can view available products" ON products
  FOR SELECT USING (
    is_available = true AND
    EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = products.supplier_id AND suppliers.is_verified = true)
  );

CREATE POLICY "Suppliers can manage their products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = products.supplier_id AND suppliers.owner_id = auth.uid())
  );

CREATE POLICY "Admins can manage all products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ORDERS POLICIES
CREATE POLICY "Contractors can view their orders" ON orders
  FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "Suppliers can view their orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = orders.supplier_id AND suppliers.owner_id = auth.uid())
  );

CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.driver_id = auth.uid())
  );

CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROJECTS POLICIES
CREATE POLICY "Contractors manage their own projects" ON projects
  FOR ALL USING (contractor_id = auth.uid());

-- SETTINGS POLICIES
CREATE POLICY "Everyone can read settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can write settings" ON settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- PART 4: CREATE HELPER FUNCTIONS
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vehicle estimation function
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
    v_safety_margin := 0.1;
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
    v.max_weight_kg ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Visible suppliers function
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

-- Order number generation
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_order_number TEXT;
BEGIN
  v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 13 FOR 5)::INTEGER), 0) + 1
  INTO v_sequence
  FROM orders
  WHERE order_number LIKE 'ORD-' || v_date_part || '-%';

  v_order_number := 'ORD-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 5, '0');

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Update supplier rating
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

CREATE TRIGGER update_supplier_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_supplier_rating();

-- Delivery approval method
CREATE OR REPLACE FUNCTION get_delivery_approval_method(p_order_total NUMERIC)
RETURNS TEXT AS $$
DECLARE
  v_photo_threshold NUMERIC;
BEGIN
  SELECT COALESCE((value->>'photo_threshold_jod')::NUMERIC, 120)
  INTO v_photo_threshold
  FROM settings
  WHERE key = 'delivery_settings';

  IF v_photo_threshold IS NULL THEN
    v_photo_threshold := 120;
  END IF;

  IF p_order_total < v_photo_threshold THEN
    RETURN 'photo';
  ELSE
    RETURN 'pin';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Site visit requirement check
CREATE OR REPLACE FUNCTION check_site_visit_requirement(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_order_total NUMERIC;
  v_site_visit_threshold NUMERIC;
BEGIN
  SELECT total_jod INTO v_order_total
  FROM orders
  WHERE id = p_order_id;

  SELECT COALESCE((value->>'site_visit_threshold_jod')::NUMERIC, 350)
  INTO v_site_visit_threshold
  FROM settings
  WHERE key = 'dispute_settings';

  IF v_site_visit_threshold IS NULL THEN
    v_site_visit_threshold := 350;
  END IF;

  RETURN v_order_total >= v_site_visit_threshold;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 5: INSERT SEED DATA
-- ==========================================

-- Insert vehicles
INSERT INTO vehicles (id, name_ar, name_en, class_code, max_weight_kg, max_volume_m3, max_length_m, has_open_bed, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'وانيت 1 طن', 'Pickup 1 Ton', 'pickup_1t', 1000, 3.5, 3, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'شاحنة 3.5 طن', 'Truck 3.5 Ton', 'truck_3.5t', 3500, 12, 4.5, false, 2),
  ('33333333-3333-3333-3333-333333333333', 'قلاب مسطح 5 طن', 'Flatbed 5 Ton', 'flatbed_5t', 5000, 18, 6, true, 3);

-- Insert settings
INSERT INTO settings (key, value, description) VALUES
  ('delivery_settings', '{"photo_threshold_jod": 120, "pin_threshold_jod": 120, "safety_margin_percent": 10}'::jsonb, 'Delivery approval thresholds and safety margin'),
  ('commission_settings', '{"commission_percent": 10, "free_period_days": 30}'::jsonb, 'Platform commission and free period settings'),
  ('dispute_settings', '{"site_visit_threshold_jod": 350, "auto_resolve_days": 7}'::jsonb, 'Dispute resolution thresholds'),
  ('platform_settings', '{"maintenance_mode": false, "allow_new_registrations": true, "default_language": "ar", "supported_languages": ["ar", "en"]}'::jsonb, 'General platform settings');

-- Insert categories
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, display_order) VALUES
  ('c1111111-1111-1111-1111-111111111111', NULL, 'مواد بناء عامة', 'General Construction', 'general-construction', 1),
  ('c2222222-2222-2222-2222-222222222222', NULL, 'كهربائيات وإنارة', 'Electrical & Lighting', 'electrical-lighting', 2),
  ('c3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'أسمنت', 'Cement', 'cement', 1),
  ('c4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'حديد', 'Steel', 'steel', 2),
  ('c5555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'رمل وحصى', 'Sand & Gravel', 'sand-gravel', 3),
  ('c6666666-6666-6666-6666-666666666666', 'c2222222-2222-2222-2222-222222222222', 'أسلاك', 'Cables', 'cables', 1),
  ('c7777777-7777-7777-7777-777777777777', 'c2222222-2222-2222-2222-222222222222', 'مفاتيح وقواطع', 'Switches & Breakers', 'switches-breakers', 2);

-- ==========================================
-- SETUP COMPLETE!
-- ==========================================
-- Check the results:
-- 1. Go to Table Editor - should see 16 tables
-- 2. Check vehicles table - should have 3 rows
-- 3. Check settings table - should have 4 rows
-- 4. Check categories table - should have 7 rows
-- ==========================================