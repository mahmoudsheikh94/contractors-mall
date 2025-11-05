-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom types/enums (idempotent - safe to run multiple times)
DO $$
BEGIN
    -- user_role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('contractor', 'supplier_admin', 'driver', 'admin');
    END IF;

    -- order_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'in_delivery', 'delivered', 'completed', 'cancelled');
    END IF;

    -- payment_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
    END IF;

    -- dispute_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
        CREATE TYPE dispute_status AS ENUM ('opened', 'investigating', 'resolved', 'escalated');
    END IF;

    -- delivery_zone enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_zone') THEN
        CREATE TYPE delivery_zone AS ENUM ('zone_a', 'zone_b');
    END IF;

    -- preferred_language enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_language') THEN
        CREATE TYPE preferred_language AS ENUM ('ar', 'en');
    END IF;
END $$;

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'contractor',
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  preferred_language preferred_language DEFAULT 'ar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- ==========================================
-- VEHICLES TABLE (Global vehicle classes)
-- ==========================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  class_code TEXT UNIQUE NOT NULL, -- e.g., 'pickup_1t', 'truck_3.5t', 'flatbed_5t'
  max_weight_kg NUMERIC(10,2) NOT NULL,
  max_volume_m3 NUMERIC(10,2) NOT NULL,
  max_length_m NUMERIC(10,2) NOT NULL,
  has_open_bed BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_class_code ON vehicles(class_code);

-- ==========================================
-- SUPPLIERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS suppliers (
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

CREATE INDEX IF NOT EXISTS idx_suppliers_owner ON suppliers(owner_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_verified ON suppliers(is_verified);
CREATE INDEX IF NOT EXISTS idx_suppliers_location ON suppliers USING GIST(location);

-- ==========================================
-- SUPPLIER ZONE FEES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS supplier_zone_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  zone delivery_zone NOT NULL,
  vehicle_class_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  base_fee_jod NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, zone, vehicle_class_id)
);

CREATE INDEX IF NOT EXISTS idx_zone_fees_supplier ON supplier_zone_fees(supplier_id);

-- ==========================================
-- CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
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

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  unit_ar TEXT NOT NULL, -- e.g., 'كيس', 'طن', 'متر مكعب'
  unit_en TEXT NOT NULL, -- e.g., 'bag', 'ton', 'm³'
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

CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);

-- ==========================================
-- PROJECTS TABLE (Contractor folders)
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
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

CREATE INDEX IF NOT EXISTS idx_projects_contractor ON projects(contractor_id);

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
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
  scheduled_delivery_time TEXT, -- e.g., 'morning', 'afternoon'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_contractor ON orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(scheduled_delivery_date);

-- ==========================================
-- ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
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

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ==========================================
-- DELIVERIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS deliveries (
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

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);

-- ==========================================
-- PAYMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
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

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_intent ON payments(payment_intent_id);

-- ==========================================
-- PAYMENT EVENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created ON payment_events(created_at);

-- ==========================================
-- DISPUTES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS disputes (
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

CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);

-- ==========================================
-- REVIEWS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_supplier ON reviews(supplier_id);

-- ==========================================
-- SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- ==========================================
-- MEDIA/ATTACHMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'product', 'delivery_proof', 'dispute'
  entity_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
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

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SUPPLIERS POLICIES
DROP POLICY IF EXISTS "Public can view verified suppliers" ON suppliers;
CREATE POLICY "Public can view verified suppliers" ON suppliers
  FOR SELECT USING (is_verified = true);

DROP POLICY IF EXISTS "Supplier admins can manage their supplier" ON suppliers;
CREATE POLICY "Supplier admins can manage their supplier" ON suppliers
  FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all suppliers" ON suppliers;
CREATE POLICY "Admins can manage all suppliers" ON suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Public can view available products" ON products;
CREATE POLICY "Public can view available products" ON products
  FOR SELECT USING (
    is_available = true AND
    EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = products.supplier_id AND suppliers.is_verified = true)
  );

DROP POLICY IF EXISTS "Suppliers can manage their products" ON products;
CREATE POLICY "Suppliers can manage their products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = products.supplier_id AND suppliers.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Admins can manage all products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Contractors can view their orders" ON orders;
CREATE POLICY "Contractors can view their orders" ON orders
  FOR SELECT USING (contractor_id = auth.uid());

DROP POLICY IF EXISTS "Suppliers can view their orders" ON orders;
CREATE POLICY "Suppliers can view their orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = orders.supplier_id AND suppliers.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;
CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.driver_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "Contractors manage their own projects" ON projects;
CREATE POLICY "Contractors manage their own projects" ON projects
  FOR ALL USING (contractor_id = auth.uid());

-- SETTINGS POLICIES
DROP POLICY IF EXISTS "Everyone can read settings" ON settings;
CREATE POLICY "Everyone can read settings" ON settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can write settings" ON settings;
CREATE POLICY "Only admins can write settings" ON settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables (idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();