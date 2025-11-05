-- ============================================
-- Verify and Activate Supplier Account
-- Email: mdsalard@live.com
-- ============================================

-- Step 1: Check if profile exists
SELECT
  id,
  email,
  role,
  full_name,
  phone,
  is_active
FROM profiles
WHERE email = 'mdsalard@live.com';

-- Expected: 1 row with role = 'supplier_admin'
-- Note the 'id' value - you'll need it for the next queries


-- Step 2: Check if supplier record exists for this user
-- Replace 'USER_ID_FROM_ABOVE' with the actual ID from Step 1
SELECT
  id,
  owner_id,
  business_name,
  business_name_en,
  phone,
  email,
  is_verified,
  verified_at,
  created_at
FROM suppliers
WHERE owner_id = (SELECT id FROM profiles WHERE email = 'mdsalard@live.com');

-- Expected: 1 row showing your supplier details


-- ============================================
-- FIX 1: If supplier record exists but is_verified = false
-- ============================================

-- Verify the supplier account so you can login
UPDATE suppliers
SET
  is_verified = true,
  verified_at = NOW()
WHERE owner_id = (
  SELECT id FROM profiles WHERE email = 'mdsalard@live.com'
);

-- Confirm it worked:
SELECT
  business_name,
  is_verified,
  verified_at
FROM suppliers
WHERE owner_id = (SELECT id FROM profiles WHERE email = 'mdsalard@live.com');

-- Expected: is_verified = true, verified_at = current timestamp


-- ============================================
-- FIX 2: If NO supplier record exists
-- ============================================

-- This creates a supplier record for the user
-- Uncomment and modify the values below if needed:

/*
INSERT INTO suppliers (
  owner_id,
  business_name,
  business_name_en,
  phone,
  email,
  address,
  latitude,
  longitude,
  is_verified,
  verified_at,
  radius_km_zone_a,
  radius_km_zone_b
) VALUES (
  (SELECT id FROM profiles WHERE email = 'mdsalard@live.com'),
  'شركة اختبار', -- Arabic business name
  'Test Company', -- English business name
  '+962791234567', -- Phone number
  'mdsalard@live.com',
  'عمان، الأردن', -- Address
  31.9539, -- Latitude (Amman)
  35.9106, -- Longitude (Amman)
  true, -- Auto-verify for testing
  NOW(),
  10, -- Zone A radius (km)
  25  -- Zone B radius (km)
);
*/


-- ============================================
-- FIX 3: If profile role is not 'supplier_admin'
-- ============================================

-- Update the role to supplier_admin
/*
UPDATE profiles
SET role = 'supplier_admin'
WHERE email = 'mdsalard@live.com';
*/


-- ============================================
-- VERIFICATION: Check everything is correct
-- ============================================

SELECT
  p.email,
  p.role,
  p.full_name,
  s.business_name,
  s.is_verified,
  s.verified_at
FROM profiles p
LEFT JOIN suppliers s ON s.owner_id = p.id
WHERE p.email = 'mdsalard@live.com';

-- Expected result:
-- email: mdsalard@live.com
-- role: supplier_admin
-- full_name: Your name
-- business_name: Your business name
-- is_verified: true
-- verified_at: Recent timestamp


-- ============================================
-- SUCCESS! Now you can login at:
-- http://localhost:3001/auth/login
-- ============================================
