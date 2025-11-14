-- ============================================================================
-- Test Data Setup Script (Simple & Correct)
-- ============================================================================
-- Prerequisites: Auth users MUST already be created in Supabase Auth Dashboard
--
-- Auth Users:
-- - contractor-test@contractors-mall.com (ID: db488ed1-53c2-43d6-bb09-8c9f3b3a5834)
-- - supplier-test@contractors-mall.com   (ID: 88c22a01-c6e7-4b06-9e8c-4319452de124)
-- - admin-test@contractors-mall.com      (ID: 034ffae8-81ed-4089-a880-1db9c6c17086)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create Profiles
-- ============================================================================

-- Contractor Profile
INSERT INTO profiles (id, full_name, phone, role)
VALUES (
  'db488ed1-53c2-43d6-bb09-8c9f3b3a5834',
  'Ahmed Test Contractor',
  '+962791234567',
  'contractor'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Supplier Profile
INSERT INTO profiles (id, full_name, phone, role)
VALUES (
  '88c22a01-c6e7-4b06-9e8c-4319452de124',
  'Mohammad Test Supplier',
  '+962791234568',
  'supplier_admin'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Admin Profile
INSERT INTO profiles (id, full_name, phone, role)
VALUES (
  '034ffae8-81ed-4089-a880-1db9c6c17086',
  'System Admin Test',
  '+962791234569',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================================================
-- STEP 2: Create Test Supplier Business
-- ============================================================================

-- First, check if supplier already exists and delete if needed
DELETE FROM suppliers WHERE owner_id = '88c22a01-c6e7-4b06-9e8c-4319452de124';

-- Insert test supplier
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
  tax_number
)
VALUES (
  '88c22a01-c6e7-4b06-9e8c-4319452de124',
  'شركة مواد البناء التجريبية',
  'Test Building Materials Co.',
  '+962791234568',
  'supplier-test@contractors-mall.com',
  'Test Street, Industrial Area, Amman',
  'Amman',
  31.9454,
  35.9284,
  10.00,
  25.00,
  true,
  NOW(),
  0.00,
  0.00,
  0.00,
  'LIC-TEST-12345',
  'TAX-TEST-67890'
)
RETURNING id;

-- Store supplier ID in variable
DO $$
DECLARE
  v_supplier_id UUID;
BEGIN
  -- Get the supplier ID we just created
  SELECT id INTO v_supplier_id
  FROM suppliers
  WHERE owner_id = '88c22a01-c6e7-4b06-9e8c-4319452de124';

  RAISE NOTICE 'Test Supplier ID: %', v_supplier_id;

  -- ============================================================================
  -- STEP 3: Create Delivery Zone Fees
  -- ============================================================================

  INSERT INTO supplier_zone_fees (supplier_id, zone, base_fee_jod)
  VALUES
    (v_supplier_id, 'zone_a', 15.00),
    (v_supplier_id, 'zone_b', 30.00)
  ON CONFLICT (supplier_id, zone) DO UPDATE SET
    base_fee_jod = EXCLUDED.base_fee_jod;

  -- ============================================================================
  -- STEP 4: Create Test Products
  -- ============================================================================

  -- Product 1: Cement (< 120 JOD for testing photo verification)
  INSERT INTO products (
    supplier_id,
    category_id,
    sku,
    name_ar,
    name_en,
    description_ar,
    description_en,
    unit_ar,
    unit_en,
    price_per_unit,
    min_order_quantity,
    weight_kg_per_unit,
    stock_quantity,
    is_available
  )
  VALUES (
    v_supplier_id,
    (SELECT id FROM categories WHERE slug = 'cement' LIMIT 1),
    'TEST-CEM-001',
    'اسمنت بورتلاند تجريبي 50 كجم',
    'Test Portland Cement 50kg',
    'اسمنت بورتلاند عالي الجودة للتجربة',
    'High quality Portland cement for testing',
    'كيس',
    'bag',
    50.00,
    1,
    50.0,
    1000,
    true
  )
  ON CONFLICT (supplier_id, sku) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    price_per_unit = EXCLUDED.price_per_unit,
    is_available = EXCLUDED.is_available;

  -- Product 2: Steel Rebar (≥ 120 JOD for testing PIN verification)
  INSERT INTO products (
    supplier_id,
    category_id,
    sku,
    name_ar,
    name_en,
    description_ar,
    description_en,
    unit_ar,
    unit_en,
    price_per_unit,
    min_order_quantity,
    weight_kg_per_unit,
    length_m_per_unit,
    stock_quantity,
    is_available
  )
  VALUES (
    v_supplier_id,
    (SELECT id FROM categories WHERE slug = 'steel' LIMIT 1),
    'TEST-STL-001',
    'حديد تسليح تجريبي 12 ملم × 12 متر',
    'Test Steel Rebar 12mm x 12m',
    'حديد تسليح عالي القوة للتجربة',
    'High strength steel rebar for testing',
    'قطعة',
    'piece',
    80.00,
    1,
    105.0,
    12.0,
    500,
    true
  )
  ON CONFLICT (supplier_id, sku) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    price_per_unit = EXCLUDED.price_per_unit,
    is_available = EXCLUDED.is_available;

  -- Product 3: Gravel (high-value for dispute testing)
  INSERT INTO products (
    supplier_id,
    category_id,
    sku,
    name_ar,
    name_en,
    description_ar,
    description_en,
    unit_ar,
    unit_en,
    price_per_unit,
    min_order_quantity,
    weight_kg_per_unit,
    stock_quantity,
    is_available
  )
  VALUES (
    v_supplier_id,
    (SELECT id FROM categories WHERE slug = 'sand-gravel' LIMIT 1),
    'TEST-GRV-001',
    'حصى مكسر تجريبي - بالجملة',
    'Test Crushed Gravel - Bulk',
    'حصى مكسر ممتاز للتجربة',
    'Premium crushed gravel for testing',
    'طن',
    'ton',
    400.00,
    1,
    1000.0,
    100,
    true
  )
  ON CONFLICT (supplier_id, sku) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    price_per_unit = EXCLUDED.price_per_unit,
    is_available = EXCLUDED.is_available;

END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

\echo ''
\echo '=== Verification Results ==='
\echo ''

\echo 'Contractor Profile:'
SELECT id, full_name, role, phone FROM profiles
WHERE id = 'db488ed1-53c2-43d6-bb09-8c9f3b3a5834';

\echo ''
\echo 'Supplier Profile & Business:'
SELECT
  s.id AS supplier_id,
  s.business_name,
  s.business_name_en,
  s.is_verified,
  s.wallet_balance,
  p.full_name AS owner_name,
  p.role AS owner_role
FROM suppliers s
JOIN profiles p ON p.id = s.owner_id
WHERE s.owner_id = '88c22a01-c6e7-4b06-9e8c-4319452de124';

\echo ''
\echo 'Admin Profile:'
SELECT id, full_name, role FROM profiles
WHERE id = '034ffae8-81ed-4089-a880-1db9c6c17086';

\echo ''
\echo 'Test Products:'
SELECT
  p.id,
  p.sku,
  p.name_en,
  p.price_per_unit,
  p.stock_quantity,
  p.is_available
FROM products p
JOIN suppliers s ON s.id = p.supplier_id
WHERE s.owner_id = '88c22a01-c6e7-4b06-9e8c-4319452de124'
ORDER BY p.sku;

\echo ''
\echo 'Delivery Zone Fees:'
SELECT
  z.zone,
  z.base_fee_jod
FROM supplier_zone_fees z
JOIN suppliers s ON s.id = z.supplier_id
WHERE s.owner_id = '88c22a01-c6e7-4b06-9e8c-4319452de124'
ORDER BY z.zone;

\echo ''
\echo '=== Setup Complete! ==='
\echo 'Next: Test login with:'
\echo '- contractor-test@contractors-mall.com / Test123!@#'
\echo '- supplier-test@contractors-mall.com / Test123!@#'
\echo '- admin-test@contractors-mall.com / Test123!@#'
