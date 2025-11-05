-- ============================================
-- Create Test Supplier Account
-- Purpose: Manually create and verify a test supplier for login testing
-- Usage: Run after using the registration page or to create manually
-- ============================================

-- OPTION 1: Verify an existing supplier from registration
-- --------------------------------------------------------
-- Use this if you already registered via http://localhost:3001/auth/register
-- Just replace the email with what you used during registration

-- Check if supplier exists
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  s.id as supplier_id,
  s.business_name,
  s.is_verified,
  s.verified_at
FROM profiles p
LEFT JOIN suppliers s ON s.owner_id = p.id
WHERE p.email = 'test@supplier.com' -- CHANGE THIS TO YOUR TEST EMAIL
ORDER BY p.created_at DESC;

-- If the supplier exists but is_verified = false, run this to verify:
UPDATE suppliers
SET
  is_verified = true,
  verified_at = NOW()
WHERE owner_id = (
  SELECT id FROM profiles WHERE email = 'test@supplier.com' -- CHANGE THIS
);

-- Verify it worked:
SELECT
  s.business_name,
  s.is_verified,
  s.verified_at,
  p.email,
  p.role
FROM suppliers s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'test@supplier.com'; -- CHANGE THIS


-- OPTION 2: Create a test supplier manually (if you haven't registered)
-- -----------------------------------------------------------------------
-- WARNING: This creates a user WITHOUT going through Supabase Auth!
-- Only use this for testing if registration page isn't working

-- Step 1: Create auth user (you'd normally do this via Supabase Auth API)
-- This step must be done through Supabase Dashboard → Authentication → Users → "Add User"
-- OR use the registration page at http://localhost:3001/auth/register

-- After creating auth user, get the user ID:
-- SELECT id, email FROM auth.users WHERE email = 'test@supplier.com';

-- Step 2: Create profile (replace 'YOUR-USER-UUID-HERE' with actual ID)
/*
INSERT INTO profiles (id, role, phone, full_name, preferred_language)
VALUES (
  'YOUR-USER-UUID-HERE'::uuid,  -- Replace with actual user ID from auth.users
  'supplier_admin',
  '+962791234567',
  'Test Supplier Owner',
  'ar'
)
ON CONFLICT (id) DO UPDATE
SET role = 'supplier_admin';
*/

-- Step 3: Create supplier business record
/*
INSERT INTO suppliers (
  owner_id,
  business_name,
  business_name_en,
  phone,
  email,
  city,
  district,
  street,
  building,
  zone_a_radius_km,
  zone_b_radius_km,
  is_verified,
  verified_at
)
VALUES (
  'YOUR-USER-UUID-HERE'::uuid,  -- Replace with actual user ID
  'مؤسسة البناء الحديث',
  'Modern Construction Est.',
  '+962791234567',
  'test@supplier.com',
  'Amman',
  'الجبيهة',
  'شارع الملك عبدالله الثاني',
  'مبنى 25',
  10.00,
  20.00,
  true,  -- Pre-verified for testing
  NOW()
)
ON CONFLICT (owner_id) DO UPDATE
SET is_verified = true, verified_at = NOW();
*/


-- OPTION 3: Quick verification of all suppliers
-- -----------------------------------------------
-- Use this to verify ALL unverified suppliers at once (dev/testing only!)

-- See all unverified suppliers:
SELECT
  s.id,
  s.business_name,
  s.is_verified,
  p.email,
  p.full_name
FROM suppliers s
JOIN profiles p ON s.owner_id = p.id
WHERE s.is_verified = false
ORDER BY s.created_at DESC;

-- Verify ALL suppliers (CAUTION: Only for dev/testing!):
/*
UPDATE suppliers
SET is_verified = true, verified_at = NOW()
WHERE is_verified = false;
*/


-- ============================================
-- TESTING THE LOGIN
-- ============================================

-- After creating/verifying supplier, test login at:
-- http://localhost:3001/auth/login
--
-- Expected flow:
-- 1. Enter email and password
-- 2. Should redirect to /supplier/dashboard
-- 3. Dashboard should load with supplier name and stats
--
-- If you see "Account Under Review", the supplier is not verified.
-- Run the UPDATE query above to verify.


-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Problem: "Account Under Review" message on login
-- Solution: Verify the supplier:
UPDATE suppliers
SET is_verified = true, verified_at = NOW()
WHERE owner_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com');

-- Problem: "Supplier not found" error on dashboard
-- Solution: Check if supplier record exists:
SELECT * FROM suppliers WHERE owner_id = (
  SELECT id FROM profiles WHERE email = 'your-email@example.com'
);

-- Problem: Login redirects back to login page
-- Solution: Check role is 'supplier_admin':
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
-- If role is not 'supplier_admin', update it:
UPDATE profiles SET role = 'supplier_admin' WHERE email = 'your-email@example.com';


-- ============================================
-- RECOMMENDED APPROACH
-- ============================================

-- ✅ BEST: Use the registration page
-- 1. Go to http://localhost:3001/auth/register
-- 2. Fill in the form
-- 3. After registration, run this to verify:

UPDATE suppliers
SET is_verified = true, verified_at = NOW()
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'your-registration-email@example.com'
);

-- ✅ Then test login at http://localhost:3001/auth/login
