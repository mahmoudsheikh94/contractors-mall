-- Test Account Setup Script
-- ========================
-- Creates test accounts for integration testing
-- Run this against the production database

-- NOTE: Replace placeholders with actual values before running
-- This script should be run by a database admin with proper permissions

BEGIN;

-- ============================================================================
-- 1. CREATE TEST CONTRACTOR ACCOUNT
-- ============================================================================

-- Create contractor profile (assumes auth user already exists)
-- You'll need to create the auth user first via Supabase Auth UI or signup flow
-- Then get the user_id and insert the profile

-- Example contractor user_id (replace with actual after creating auth user):
-- contractor_test_user_id: '00000000-0000-0000-0000-000000000001'

INSERT INTO profiles (id, full_name, phone_number, role, email_verified, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with actual auth user ID
  'Ahmed Test Contractor',
  '+962791234567',
  'contractor',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified,
  updated_at = NOW();

-- ============================================================================
-- 2. CREATE TEST SUPPLIER ACCOUNT
-- ============================================================================

-- Example supplier user_id (replace with actual after creating auth user):
-- supplier_test_user_id: '00000000-0000-0000-0000-000000000002'

-- Create supplier profile
INSERT INTO profiles (id, full_name, phone_number, role, email_verified, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- Replace with actual auth user ID
  'Mohammad Test Supplier',
  '+962791234568',
  'supplier_admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified,
  updated_at = NOW();

-- Create supplier business
INSERT INTO suppliers (
  id,
  owner_id,
  business_name,
  business_name_ar,
  business_type,
  license_number,
  tax_number,
  address,
  city,
  phone,
  email,
  status,
  verified,
  verification_date,
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000001', -- Test supplier ID
  '00000000-0000-0000-0000-000000000002', -- owner_id
  'Test Building Materials Co.',
  'شركة مواد البناء التجريبية',
  'materials_supplier',
  'LIC-TEST-12345',
  'TAX-TEST-67890',
  'Test Street, Industrial Area',
  'Amman',
  '+962791234568',
  'supplier@test.com',
  'active',
  true,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  business_name = EXCLUDED.business_name,
  business_name_ar = EXCLUDED.business_name_ar,
  status = EXCLUDED.status,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Create supplier wallet
INSERT INTO wallets (
  id,
  supplier_id,
  available_balance,
  pending_balance,
  total_earned,
  total_withdrawn,
  created_at,
  updated_at
)
VALUES (
  '20000000-0000-0000-0000-000000000001', -- Wallet ID
  '10000000-0000-0000-0000-000000000001', -- supplier_id
  0,  -- available_balance
  0,  -- pending_balance
  0,  -- total_earned
  0,  -- total_withdrawn
  NOW(),
  NOW()
)
ON CONFLICT (supplier_id) DO UPDATE
SET updated_at = NOW();

-- ============================================================================
-- 3. CREATE TEST ADMIN ACCOUNT
-- ============================================================================

-- Example admin user_id (replace with actual after creating auth user):
-- admin_test_user_id: '00000000-0000-0000-0000-000000000003'

INSERT INTO profiles (id, full_name, phone_number, role, email_verified, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003', -- Replace with actual auth user ID
  'System Admin Test',
  '+962791234569',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified,
  updated_at = NOW();

-- ============================================================================
-- 4. CREATE TEST PRODUCTS
-- ============================================================================

-- Get or insert category (assuming 'cement' category exists)
-- If not, create it first

INSERT INTO products (
  id,
  supplier_id,
  category_id,
  name,
  name_ar,
  description,
  description_ar,
  sku,
  unit_price,
  unit_of_measure,
  stock_quantity,
  min_order_quantity,
  max_order_quantity,
  weight_kg,
  dimensions_cm,
  available,
  featured,
  created_at,
  updated_at
)
VALUES
  -- Product 1: Cement (< 120 JOD when ordering 1-2 bags)
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', -- supplier_id
    (SELECT id FROM categories WHERE slug = 'cement' LIMIT 1), -- Get cement category
    'Test Portland Cement 50kg',
    'اسمنت بورتلاند تجريبي 50 كجم',
    'High quality Portland cement for testing',
    'اسمنت بورتلاند عالي الجودة للتجربة',
    'TEST-CEM-001',
    50.00, -- 50 JOD per bag
    'bag',
    1000, -- stock
    1,    -- min order
    100,  -- max order
    50.0, -- weight
    '{"length": 40, "width": 30, "height": 10}',
    true,
    true,
    NOW(),
    NOW()
  ),
  -- Product 2: Steel Bars (≥ 120 JOD when ordering multiple)
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001', -- supplier_id
    (SELECT id FROM categories WHERE slug = 'steel' LIMIT 1), -- Get steel category
    'Test Steel Rebar 12mm x 12m',
    'حديد تسليح تجريبي 12 ملم × 12 متر',
    'High strength steel rebar for testing',
    'حديد تسليح عالي القوة للتجربة',
    'TEST-STL-001',
    80.00, -- 80 JOD per piece
    'piece',
    500,
    1,
    50,
    105.0, -- ~105 kg per 12m bar
    '{"length": 1200, "width": 1.2, "height": 1.2}',
    true,
    true,
    NOW(),
    NOW()
  ),
  -- Product 3: Gravel (for high-value dispute testing)
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001', -- supplier_id
    (SELECT id FROM categories WHERE slug = 'aggregates' LIMIT 1),
    'Test Crushed Gravel - Bulk',
    'حصى مكسر تجريبي - بالجملة',
    'Premium crushed gravel for testing',
    'حصى مكسر ممتاز للتجربة',
    'TEST-GRV-001',
    400.00, -- 400 JOD per ton (for high-value testing)
    'ton',
    100,
    1,
    10,
    1000.0,
    '{"length": 100, "width": 100, "height": 100}',
    true,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  unit_price = EXCLUDED.unit_price,
  stock_quantity = EXCLUDED.stock_quantity,
  updated_at = NOW();

-- ============================================================================
-- 5. CREATE DELIVERY ZONES FOR TEST SUPPLIER
-- ============================================================================

INSERT INTO supplier_delivery_zones (
  id,
  supplier_id,
  zone_name,
  zone_type,
  base_delivery_fee,
  per_km_fee,
  max_distance_km,
  estimated_delivery_days,
  active,
  created_at,
  updated_at
)
VALUES
  -- Zone A (close, cheaper)
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Test Zone A - Central Amman',
    'zone_a',
    15.00,  -- base fee
    2.00,   -- per km
    10,     -- max 10km
    1,      -- next day
    true,
    NOW(),
    NOW()
  ),
  -- Zone B (farther, more expensive)
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Test Zone B - Greater Amman',
    'zone_b',
    30.00,  -- base fee
    3.00,   -- per km
    25,     -- max 25km
    2,      -- 2 days
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET
  base_delivery_fee = EXCLUDED.base_delivery_fee,
  active = EXCLUDED.active,
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify contractor
SELECT id, full_name, role, email_verified FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify supplier
SELECT s.id, s.business_name, s.status, s.verified, w.id as wallet_id
FROM suppliers s
LEFT JOIN wallets w ON w.supplier_id = s.id
WHERE s.id = '10000000-0000-0000-0000-000000000001';

-- Verify admin
SELECT id, full_name, role FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000003';

-- Verify products
SELECT id, name, unit_price, stock_quantity, available
FROM products
WHERE supplier_id = '10000000-0000-0000-0000-000000000001';

-- Verify zones
SELECT id, zone_name, zone_type, base_delivery_fee, active
FROM supplier_delivery_zones
WHERE supplier_id = '10000000-0000-0000-0000-000000000001';

-- ============================================================================
-- NOTES FOR MANUAL SETUP
-- ============================================================================

/*
BEFORE RUNNING THIS SCRIPT:

1. Create Auth Users in Supabase Auth:
   - Go to Supabase Dashboard → Authentication → Users
   - Create three users:
     a. contractor-test@contractors-mall.com (password: Test123!@#)
     b. supplier-test@contractors-mall.com (password: Test123!@#)
     c. admin-test@contractors-mall.com (password: Test123!@#)

2. Get the User IDs:
   - After creating each auth user, copy their UUID
   - Replace the placeholder UUIDs in this script:
     - '00000000-0000-0000-0000-000000000001' → contractor auth user ID
     - '00000000-0000-0000-0000-000000000002' → supplier auth user ID
     - '00000000-0000-0000-0000-000000000003' → admin auth user ID

3. Verify Categories Exist:
   - Check that categories 'cement', 'steel', and 'aggregates' exist
   - If not, create them first or adjust the category_id selection

4. Run This Script:
   - Connect to your Supabase database
   - Execute this SQL script
   - Verify the results using the verification queries at the end

5. Test Login:
   - Try logging in with each account
   - Verify roles are correctly assigned
   - Check that supplier can access supplier portal
   - Check that admin can access admin portal

CREDENTIALS FOR TESTING:
- Contractor: contractor-test@contractors-mall.com / Test123!@#
- Supplier: supplier-test@contractors-mall.com / Test123!@#
- Admin: admin-test@contractors-mall.com / Test123!@#
*/
