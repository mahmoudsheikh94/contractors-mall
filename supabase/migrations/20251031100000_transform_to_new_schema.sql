-- ============================================
-- Transform Old Schema to New Schema
-- Date: 2025-10-31
-- Purpose: Update existing database to match Order Management UI requirements
-- ============================================
--
-- NAMING CONVENTION TRANSFORMATION:
-- This migration ensures all tables follow the standard convention:
-- - Primary keys: 'id' (not 'order_id', 'payment_id', etc.)
-- - Foreign keys: '{table}_id' (e.g., order_id, supplier_id)
--
-- The renaming blocks (DO $$ ... END $$) check if columns need to be
-- renamed from 'id' → '{table}_id' or vice versa depending on context.
-- After this migration, ALL primary keys are named 'id'.
--
-- See docs/DATABASE_CONVENTIONS.md for full convention details.
-- ============================================

-- This migration transforms your existing database structure to match
-- the requirements of the new Order Management UI (Phase 5B)

BEGIN;

-- ==========================================
-- PART 1: UPDATE ORDERS TABLE
-- ==========================================

-- Add missing columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT, -- Will store class_code from vehicles table
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_time_slot TEXT,
  ADD COLUMN IF NOT EXISTS delivery_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS delivery_city TEXT,
  ADD COLUMN IF NOT EXISTS delivery_building TEXT,
  ADD COLUMN IF NOT EXISTS delivery_floor TEXT,
  ADD COLUMN IF NOT EXISTS delivery_apartment TEXT,
  ADD COLUMN IF NOT EXISTS delivery_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB;

-- Copy data from old columns to new columns
UPDATE orders SET
  delivery_date = scheduled_delivery_date,
  delivery_time_slot = scheduled_delivery_time,
  delivery_notes = notes,
  delivery_phone = delivery_address, -- TEMPORARY: You'll need to update this manually
  delivery_coordinates = jsonb_build_object(
    'latitude', delivery_latitude,
    'longitude', delivery_longitude
  );

-- Populate vehicle_type from vehicle_class_id FK
UPDATE orders o
SET vehicle_type = v.class_code
FROM vehicles v
WHERE o.vehicle_class_id = v.id
  AND o.vehicle_type IS NULL;

-- Set default vehicle_type for orders without vehicle_class_id
UPDATE orders
SET vehicle_type = 'pickup_1ton'
WHERE vehicle_type IS NULL;

-- Make vehicle_type NOT NULL after populating
ALTER TABLE orders ALTER COLUMN vehicle_type SET NOT NULL;

-- ==========================================
-- PART 2: UPDATE ORDER_ITEMS TABLE
-- ==========================================

-- Add missing columns to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS unit_price_jod NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_jod NUMERIC(10,2);

-- Populate new columns from existing data
UPDATE order_items oi
SET
  product_name = p.name_ar,
  unit = p.unit_ar,
  unit_price_jod = oi.unit_price,
  total_jod = oi.total_price
FROM products p
WHERE oi.product_id = p.id
  AND oi.product_name IS NULL;

-- Set defaults for any rows that couldn't be populated
UPDATE order_items
SET
  product_name = 'Unknown Product',
  unit = 'unit',
  unit_price_jod = COALESCE(unit_price, 0),
  total_jod = COALESCE(total_price, 0)
WHERE product_name IS NULL;

-- Make new columns NOT NULL
ALTER TABLE order_items
  ALTER COLUMN product_name SET NOT NULL,
  ALTER COLUMN unit SET NOT NULL,
  ALTER COLUMN unit_price_jod SET NOT NULL,
  ALTER COLUMN total_jod SET NOT NULL;

-- Rename primary key column (optional - for consistency)
-- Note: This requires dropping and recreating constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE order_items RENAME COLUMN id TO item_id;
  END IF;
END $$;

-- ==========================================
-- PART 3: TRANSFORM DELIVERIES TABLE
-- ==========================================

-- Add missing columns to deliveries table
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time_slot TEXT,
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS building_number TEXT,
  ADD COLUMN IF NOT EXISTS floor_number TEXT,
  ADD COLUMN IF NOT EXISTS apartment_number TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS coordinates JSONB,
  ADD COLUMN IF NOT EXISTS delivery_pin TEXT,
  ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ;

-- Populate new columns from orders table
UPDATE deliveries d
SET
  scheduled_date = o.delivery_date,
  scheduled_time_slot = o.delivery_time_slot,
  address_line = o.delivery_address,
  neighborhood = o.delivery_neighborhood,
  city = o.delivery_city,
  building_number = o.delivery_building,
  floor_number = o.delivery_floor,
  apartment_number = o.delivery_apartment,
  phone = o.delivery_phone,
  coordinates = o.delivery_coordinates
FROM orders o
WHERE d.order_id = o.id
  AND d.scheduled_date IS NULL;

-- Copy data from old columns to new columns
UPDATE deliveries
SET
  delivery_pin = confirmation_pin,
  photo_url = proof_photo_url,
  pin_verified_at = CASE WHEN pin_verified = true THEN completed_at END
WHERE delivery_pin IS NULL;

-- Make critical columns NOT NULL
ALTER TABLE deliveries
  ALTER COLUMN scheduled_date SET NOT NULL,
  ALTER COLUMN scheduled_time_slot SET NOT NULL,
  ALTER COLUMN address_line SET NOT NULL,
  ALTER COLUMN neighborhood SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

-- Rename primary key column (optional - for consistency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'delivery_id'
  ) THEN
    ALTER TABLE deliveries RENAME COLUMN id TO delivery_id;
  END IF;
END $$;

-- ==========================================
-- PART 4: ADD SUPPLIER RLS POLICIES
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Suppliers can view their orders" ON orders;
DROP POLICY IF EXISTS "Suppliers can update their orders" ON orders;
DROP POLICY IF EXISTS "Suppliers can view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Suppliers can view payments" ON payments;

-- Suppliers can view their orders
CREATE POLICY "Suppliers can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

-- Suppliers can update their orders (accept/reject)
CREATE POLICY "Suppliers can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

-- Suppliers can view deliveries for their orders
CREATE POLICY "Suppliers can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = deliveries.order_id
        AND s.owner_id = auth.uid()
    )
  );

-- Suppliers can view payments for their orders
CREATE POLICY "Suppliers can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.id = payments.order_id
        AND s.owner_id = auth.uid()
    )
  );

-- ==========================================
-- PART 5: ADD INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_orders_vehicle_type ON orders(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);

-- ==========================================
-- PART 6: UPDATE COMMENTS
-- ==========================================

COMMENT ON COLUMN orders.vehicle_type IS 'Auto-selected vehicle type for delivery (from vehicles.class_code)';
COMMENT ON COLUMN orders.rejection_reason IS 'Supplier reason for rejecting order';
COMMENT ON COLUMN orders.delivery_notes IS 'Special delivery instructions from contractor';
COMMENT ON COLUMN orders.disputed_at IS 'Timestamp when order was disputed';
COMMENT ON COLUMN orders.dispute_reason IS 'Contractor description of the dispute';

COMMENT ON COLUMN order_items.product_name IS 'Product name snapshot at time of order';
COMMENT ON COLUMN order_items.unit IS 'Unit of measurement';
COMMENT ON COLUMN order_items.unit_price_jod IS 'Price per unit in JOD';
COMMENT ON COLUMN order_items.total_jod IS 'Total price for this line item in JOD';

COMMENT ON COLUMN deliveries.delivery_pin IS '4-digit PIN for orders >= 120 JOD';
COMMENT ON COLUMN deliveries.photo_url IS 'URL of delivery proof photo for orders < 120 JOD';
COMMENT ON COLUMN deliveries.pin_attempts IS 'Number of PIN verification attempts (max 3)';
COMMENT ON COLUMN deliveries.pin_verified_at IS 'Timestamp when PIN was successfully verified';
COMMENT ON COLUMN deliveries.photo_uploaded_at IS 'Timestamp when delivery photo was uploaded';

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Schema transformation complete!';
  RAISE NOTICE '   - Orders table: Added 13 new columns';
  RAISE NOTICE '   - Order_items table: Added 4 new columns';
  RAISE NOTICE '   - Deliveries table: Added 15 new columns';
  RAISE NOTICE '   - RLS policies: Added 4 supplier policies';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  MANUAL ACTIONS REQUIRED:';
  RAISE NOTICE '   1. Update delivery_phone in orders table with actual phone numbers';
  RAISE NOTICE '   2. Verify delivery addresses are properly split (neighborhood, city, etc.)';
  RAISE NOTICE '   3. Test supplier login and order management UI';
END $$;

COMMIT;
