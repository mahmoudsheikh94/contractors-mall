-- ==========================================
-- ADD MISSING RLS POLICIES
-- ==========================================
-- Fix for missing SELECT policies on categories, vehicles, and supplier_zone_fees
-- These are reference/lookup tables that should be publicly readable

-- ==========================================
-- CATEGORIES POLICIES
-- ==========================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

-- Allow everyone to read active categories
CREATE POLICY "Public can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- VEHICLES POLICIES
-- ==========================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can manage vehicles" ON vehicles;

-- Allow everyone to read active vehicles
CREATE POLICY "Public can view active vehicles" ON vehicles
  FOR SELECT USING (is_active = true);

-- Only admins can manage vehicles
CREATE POLICY "Admins can manage vehicles" ON vehicles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- SUPPLIER ZONE FEES POLICIES
-- ==========================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view zone fees for verified suppliers" ON supplier_zone_fees;
DROP POLICY IF EXISTS "Suppliers can manage their zone fees" ON supplier_zone_fees;

-- Allow everyone to read zone fees for verified suppliers
CREATE POLICY "Public can view zone fees for verified suppliers" ON supplier_zone_fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = supplier_zone_fees.supplier_id
      AND suppliers.is_verified = true
    )
  );

-- Supplier admins can manage their own zone fees
CREATE POLICY "Suppliers can manage their zone fees" ON supplier_zone_fees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = supplier_zone_fees.supplier_id
      AND suppliers.owner_id = auth.uid()
    )
  );

-- Admins can manage all zone fees
CREATE POLICY "Admins can manage all zone fees" ON supplier_zone_fees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
-- Check that policies were created successfully
DO $
DECLARE
  v_categories_count INTEGER;
  v_vehicles_count INTEGER;
  v_zone_fees_count INTEGER;
BEGIN
  -- Count policies for each table
  SELECT COUNT(*) INTO v_categories_count
  FROM pg_policies
  WHERE tablename = 'categories';

  SELECT COUNT(*) INTO v_vehicles_count
  FROM pg_policies
  WHERE tablename = 'vehicles';

  SELECT COUNT(*) INTO v_zone_fees_count
  FROM pg_policies
  WHERE tablename = 'supplier_zone_fees';

  RAISE NOTICE '
  ════════════════════════════════════════════════════════════════
  ✅ RLS POLICIES ADDED SUCCESSFULLY
  ════════════════════════════════════════════════════════════════
  Created policies for:
  - categories: % policies (2 expected: public read + admin write)
  - vehicles: % policies (2 expected: public read + admin write)
  - supplier_zone_fees: % policies (3 expected: public read + supplier write + admin write)

  These tables can now be read by:
  - Anyone (authenticated or not) for active/verified items
  - Suppliers can manage their own zone fees
  - Admins can manage everything

  This fixes:
  - Product page error (categories now readable)
  - Future vehicle selection (vehicles now readable)
  - Delivery fee display (zone fees now readable)
  ════════════════════════════════════════════════════════════════
  ', v_categories_count, v_vehicles_count, v_zone_fees_count;
END $;

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON POLICY "Public can view active categories" ON categories IS
  'Allow everyone to browse active product categories';

COMMENT ON POLICY "Public can view active vehicles" ON vehicles IS
  'Allow everyone to see available vehicle types for delivery estimation';

COMMENT ON POLICY "Public can view zone fees for verified suppliers" ON supplier_zone_fees IS
  'Allow everyone to see delivery fees for verified suppliers';
