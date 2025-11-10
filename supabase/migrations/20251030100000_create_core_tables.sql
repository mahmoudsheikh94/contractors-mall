-- ============================================
-- Create Core Tables (If Not Exist)
-- Date: 2025-10-30
-- Purpose: Ensure all core tables exist before applying Phase 4 updates
-- ============================================
--
-- NAMING CONVENTION:
-- - All primary keys are named 'id'
-- - All foreign keys are named '{table}_id' (e.g., order_id, supplier_id)
-- - This follows industry standard (Rails, Django, Laravel, Supabase)
-- - See docs/DATABASE_CONVENTIONS.md for full details
--
-- NOTE: This migration originally created tables with {table}_id as PKs
-- (e.g., order_id, payment_id). These were later transformed to use 'id'
-- via migration 20251031100000_transform_to_new_schema.sql
-- The current schema uses 'id' for all primary keys.
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums if they don't exist
DO $$
BEGIN
    -- Order status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'accepted', 'in_delivery', 'delivered', 'completed', 'cancelled', 'rejected', 'disputed');
    END IF;

    -- Payment status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'escrow_held', 'released', 'refunded', 'failed', 'frozen');
    END IF;
END $$;

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  contractor_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  subtotal_jod NUMERIC(10,2) NOT NULL,
  delivery_fee_jod NUMERIC(10,2) NOT NULL,
  total_jod NUMERIC(10,2) NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'pickup_1ton', 'truck_3_5ton', 'flatbed_5ton'

  -- Delivery schedule
  delivery_date DATE NOT NULL,
  delivery_time_slot TEXT NOT NULL, -- 'morning', 'afternoon', 'evening'

  -- Address details
  delivery_address TEXT NOT NULL,
  delivery_neighborhood TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_building TEXT,
  delivery_floor TEXT,
  delivery_apartment TEXT,
  delivery_phone TEXT NOT NULL,
  delivery_coordinates JSONB,

  -- Dispute fields (for Phase 4)
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,

  -- Rejection (when supplier rejects order)
  rejection_reason TEXT,

  -- Metadata
  delivery_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_contractor ON orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- ==========================================
-- ORDER_ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_name_en TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price_jod NUMERIC(10,2) NOT NULL,
  unit TEXT NOT NULL,
  total_jod NUMERIC(10,2) NOT NULL,
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
  delivery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,

  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time_slot TEXT NOT NULL,

  -- Driver info (optional for Phase 5)
  driver_id UUID,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_plate_number TEXT,

  -- Address (copy from order for immutability)
  address_line TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  building_number TEXT,
  floor_number TEXT,
  apartment_number TEXT,
  phone TEXT NOT NULL,
  coordinates JSONB,

  -- Delivery confirmation
  delivery_pin TEXT, -- 4-digit PIN for orders >= 120 JOD
  pin_attempts INTEGER DEFAULT 0,
  pin_verified_at TIMESTAMPTZ,

  photo_url TEXT, -- Photo proof for orders < 120 JOD
  photo_uploaded_at TIMESTAMPTZ,

  -- Tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Other
  recipient_name TEXT,
  recipient_phone TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled ON deliveries(scheduled_date);

-- ==========================================
-- PAYMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,

  -- Payment details
  payment_method TEXT DEFAULT 'escrow',
  status TEXT DEFAULT 'pending', -- 'pending', 'escrow_held', 'released', 'refunded', 'failed', 'frozen'
  amount_jod NUMERIC(10,2) NOT NULL,

  -- External payment provider
  payment_intent_id TEXT UNIQUE,
  provider_metadata JSONB DEFAULT '{}',

  -- Status timestamps
  held_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  frozen_at TIMESTAMPTZ,

  -- Transaction tracking
  transaction_id TEXT,
  transaction_reference TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_intent ON payments(payment_intent_id);

-- ==========================================
-- PAYMENT_EVENTS TABLE (for audit trail)
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'held', 'released', 'refunded', 'frozen'
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created ON payment_events(created_at);

-- ==========================================
-- Add Comments for Documentation
-- ==========================================
COMMENT ON TABLE orders IS 'Main orders table tracking all contractor orders';
COMMENT ON TABLE order_items IS 'Line items for each order';
COMMENT ON TABLE deliveries IS 'Delivery tracking and confirmation for orders';
COMMENT ON TABLE payments IS 'Payment tracking with escrow support';
COMMENT ON TABLE payment_events IS 'Audit trail for payment status changes';

COMMENT ON COLUMN orders.status IS 'Order lifecycle status';
COMMENT ON COLUMN orders.disputed_at IS 'Timestamp when order was disputed';
COMMENT ON COLUMN orders.dispute_reason IS 'Contractor description of the dispute';
COMMENT ON COLUMN orders.rejection_reason IS 'Supplier reason for rejecting order';
COMMENT ON COLUMN orders.vehicle_type IS 'Auto-selected vehicle type for delivery';
COMMENT ON COLUMN orders.delivery_notes IS 'Special delivery instructions from contractor';

COMMENT ON COLUMN deliveries.delivery_pin IS '4-digit PIN for orders >= 120 JOD';
COMMENT ON COLUMN deliveries.photo_url IS 'URL of delivery proof photo for orders < 120 JOD';
COMMENT ON COLUMN deliveries.pin_attempts IS 'Number of PIN verification attempts (max 3)';

COMMENT ON COLUMN payments.status IS 'Payment status: pending, escrow_held, released, refunded, failed, frozen';

-- ==========================================
-- Grant Permissions for Supabase
-- ==========================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Enable RLS on sensitive tables (optional - add policies as needed)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Create simple RLS policies for authenticated users
-- ==========================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Suppliers can view their orders" ON orders;
DROP POLICY IF EXISTS "Suppliers can update their orders" ON orders;
DROP POLICY IF EXISTS "Users can view own deliveries" ON deliveries;
DROP POLICY IF EXISTS "Suppliers can view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Suppliers can view payments" ON payments;
DROP POLICY IF EXISTS "Service role full access orders" ON orders;
DROP POLICY IF EXISTS "Service role full access deliveries" ON deliveries;
DROP POLICY IF EXISTS "Service role full access payments" ON payments;

-- Orders: Users can see their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (contractor_id = auth.uid());

-- Orders: Suppliers can see their orders
CREATE POLICY "Suppliers can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (supplier_id = auth.uid());

-- Orders: Suppliers can update their orders (accept/reject)
CREATE POLICY "Suppliers can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

-- Deliveries: Users can see deliveries for their orders
CREATE POLICY "Users can view own deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = deliveries.order_id
      AND orders.contractor_id = auth.uid()
    )
  );

-- Deliveries: Suppliers can see deliveries for their orders
CREATE POLICY "Suppliers can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = deliveries.order_id
      AND orders.supplier_id = auth.uid()
    )
  );

-- Payments: Users can see payments for their orders
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = payments.order_id
      AND orders.contractor_id = auth.uid()
    )
  );

-- Payments: Suppliers can see payments for their orders
CREATE POLICY "Suppliers can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = payments.order_id
      AND orders.supplier_id = auth.uid()
    )
  );

-- Service role bypass for all tables
CREATE POLICY "Service role full access orders"
  ON orders TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access deliveries"
  ON deliveries TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access payments"
  ON payments TO service_role
  USING (true) WITH CHECK (true);

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE 'Core tables created successfully. Tables created/verified: orders, order_items, deliveries, payments, payment_events';
END $$;