-- Test Account Setup Script (CORRECTED VERSION)
-- ================================================
-- Creates test accounts for integration testing
-- Run this against the production database
--
-- IMPORTANT: Auth users MUST be created first via Supabase Auth Dashboard
-- Then replace the UUIDs below with the actual auth user IDs

BEGIN;

-- ============================================================================
-- 1. CREATE TEST CONTRACTOR PROFILE
-- ============================================================================

INSERT INTO profiles (id, full_name, phone, role, created_at, updated_at)
VALUES (
  'db488ed1-53c2-43d6-bb09-8c9f3b3a5834', -- Contractor auth user ID
  'Ahmed Test Contractor',
  '+962791234567',
  'contractor',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================================================
-- 2. CREATE TEST SUPPLIER PROFILE & BUSINESS
-- ============================================================================

-- Create supplier profile
INSERT INTO profiles (id, full_name, phone, role, created_at, updated_at)
VALUES (
  '88c22a01-c6e7-4b06-9e8c-4319452de124', -- Supplier auth user ID
  'Mohammad Test Supplier',
  '+962791234568',
  'supplier_admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create supplier business (using gen_random_uuid() for proper UUID)
DO $$
DECLARE
  test_supplier_id UUID;
BEGIN
  -- Generate or get existing test supplier
  INSERT INTO suppliers (
    owner_id,
    business_name,
    business_name_en,
    phone,
    email,
    address,
    city,
    latitude,
    longitude,
    radius_km_zone_a,
    radius_km_zone_b,
    is_verified,
    verified_at,
    wallet_balance,
    wallet_pending,
    wallet_available,
    license_number,
    tax_number,
    created_at,
    updated_at
  )
  VALUES (
    '88c22a01-c6e7-4b06-9e8c-4319452de124', -- owner_id
    'شركة مواد البناء التجريبية',
    'Test Building Materials Co.',
    '+962791234568',
    'supplier-test@contractors-mall.com',
    'Test Street, Industrial Area, Amman',
    'Amman',
    31.9454,  -- Amman latitude
    35.9284,  -- Amman longitude
    10.00,    -- Zone A radius (10 km)
    25.00,    -- Zone B radius (25 km)
    true,     -- verified
    NOW(),    -- verified_at
    0.00,     -- wallet_balance
    0.00,     -- wallet_pending
    0.00,     -- wallet_available
    'LIC-TEST-12345',
    'TAX-TEST-67890',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    business_name = EXCLUDED.business_name,
    business_name_en = EXCLUDED.business_name_en,
    is_verified = EXCLUDED.is_verified,
    verified_at = EXCLUDED.verified_at,
    updated_at = NOW()
  RETURNING id INTO test_supplier_id;

  -- Store the supplier ID for later use
  CREATE TEMP TABLE IF NOT EXISTS temp_test_ids (
    supplier_id UUID
  );
  DELETE FROM temp_test_ids;
  INSERT INTO temp_test_ids (supplier_id) VALUES (test_supplier_id);
END $$;

-- ============================================================================
-- 3. CREATE TEST ADMIN PROFILE
-- ============================================================================

INSERT INTO profiles (id, full_name, phone, role, created_at, updated_at)
VALUES (
  '034ffae8-81ed-4089-a880-1db9c6c17086', -- Admin auth user ID
  'System Admin Test',
  '+962791234569',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================================================
-- 4. CREATE TEST PRODUCTS
-- ============================================================================

-- Get or insert category IDs (assuming categories exist)
-- If categories don't exist, you'll need to create them first

INSERT INTO products (
  id,
  supplier_id,
  category_id,
  name,
  name_en,
  description,
  description_en,
  sku,
  unit_price,
  unit,
  stock_quantity,
  min_order_quantity,
  max_order_quantity,
  weight_kg,
  is_available,
  is_featured,
  created_at,
  updated_at
)
VALUES
  -- Product 1: Cement (< 120 JOD when ordering 1-2 bags)
  (
    'b0000000-test-test-test-product00001',
    'a0000000-test-test-test-supplier00001', -- supplier_id
    (SELECT id FROM categories WHERE slug = 'cement' LIMIT 1), -- Get cement category
    'اسمنت بورتلاند تجريبي 50 كجم',
    'Test Portland Cement 50kg',
    'اسمنت بورتلاند عالي الجودة للتجربة',
    'High quality Portland cement for testing',
    'TEST-CEM-001',
    50.00, -- 50 JOD per bag (2 bags = 100 JOD + delivery < 120 JOD)
    'bag',
    1000, -- stock
    1,    -- min order
    100,  -- max order
    50.0, -- weight
    true, -- is_available
    true, -- is_featured
    NOW(),
    NOW()
  ),
  -- Product 2: Steel Bars (≥ 120 JOD when ordering 2+)
  (
    'b0000000-test-test-test-product00002',
    'a0000000-test-test-test-supplier00001', -- supplier_id
    (SELECT id FROM categories WHERE slug = 'steel' LIMIT 1), -- Get steel category
    'حديد تسليح تجريبي 12 ملم × 12 متر',
    'Test Steel Rebar 12mm x 12m',
    'حديد تسليح عالي القوة للتجربة',
    'High strength steel rebar for testing',
    'TEST-STL-001',
    80.00, -- 80 JOD per piece (2 pieces = 160 JOD + delivery ≥ 120 JOD)
    'piece',
    500,
    1,
    50,
    105.0, -- ~105 kg per 12m bar
    true,
    true,
    NOW(),
    NOW()
  ),
  -- Product 3: Gravel (for high-value dispute testing)
  (
    'b0000000-test-test-test-product00003',
    'a0000000-test-test-test-supplier00001', -- supplier_id
    (SELECT id FROM categories WHERE slug = 'aggregates' LIMIT 1),
    'حصى مكسر تجريبي - بالجملة',
    'Test Crushed Gravel - Bulk',
    'حصى مكسر ممتاز للتجربة',
    'Premium crushed gravel for testing',
    'TEST-GRV-001',
    400.00, -- 400 JOD per ton (for high-value testing)
    'ton',
    100,
    1,
    10,
    1000.0,
    true,
    false, -- not featured
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  unit_price = EXCLUDED.unit_price,
  stock_quantity = EXCLUDED.stock_quantity,
  updated_at = NOW();

-- ============================================================================
-- 5. CREATE DELIVERY ZONE FEES FOR TEST SUPPLIER
-- ============================================================================

INSERT INTO supplier_zone_fees (
  id,
  supplier_id,
  zone,
  base_fee_jod,
  created_at,
  updated_at
)
VALUES
  -- Zone A (close, cheaper)
  (
    'c0000000-test-test-test-zonefee0001',
    'a0000000-test-test-test-supplier00001',
    'zone_a',
    15.00,  -- 15 JOD base fee for Zone A
    NOW(),
    NOW()
  ),
  -- Zone B (farther, more expensive)
  (
    'c0000000-test-test-test-zonefee0002',
    'a0000000-test-test-test-supplier00001',
    'zone_b',
    30.00,  -- 30 JOD base fee for Zone B
    NOW(),
    NOW()
  )
ON CONFLICT (supplier_id, zone) DO UPDATE
SET
  base_fee_jod = EXCLUDED.base_fee_jod,
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify contractor profile
SELECT id, full_name, role, phone FROM profiles
WHERE id = 'db488ed1-53c2-43d6-bb09-8c9f3b3a5834';

-- Verify supplier profile and business
SELECT
  s.id,
  s.business_name,
  s.business_name_en,
  s.is_verified,
  s.wallet_balance,
  s.wallet_pending,
  s.wallet_available,
  p.full_name as owner_name
FROM suppliers s
JOIN profiles p ON p.id = s.owner_id
WHERE s.id = 'a0000000-test-test-test-supplier00001';

-- Verify admin profile
SELECT id, full_name, role FROM profiles
WHERE id = '034ffae8-81ed-4089-a880-1db9c6c17086';

-- Verify products
SELECT id, name, name_en, unit_price, stock_quantity, is_available
FROM products
WHERE supplier_id = 'a0000000-test-test-test-supplier00001';

-- Verify zone fees
SELECT id, zone, base_fee_jod
FROM supplier_zone_fees
WHERE supplier_id = 'a0000000-test-test-test-supplier00001';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
--
-- Next Steps:
-- 1. Verify all records were created successfully using the queries above
-- 2. Test login for each account:
--    - Contractor: contractor-test@contractors-mall.com / Test123!@#
--    - Supplier: supplier-test@contractors-mall.com / Test123!@#
--    - Admin: admin-test@contractors-mall.com / Test123!@#
-- 3. Proceed with the integration test walkthrough in:
--    docs/HANDS_ON_TESTING_WALKTHROUGH.md
