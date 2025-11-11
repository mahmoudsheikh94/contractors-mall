-- ================================================
-- COMPREHENSIVE TEST DATA FOR CONTRACTORS MALL
-- ================================================
-- Run with: psql or Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE TEST SUPPLIERS (3)
-- ================================================
-- Note: Auth users must be created via Supabase Dashboard or API
-- This SQL only creates the profiles and supplier records
--
-- Create these auth users first via Dashboard:
-- 1. supplier1@contractors.jo / TestSupplier123!
-- 2. supplier2@contractors.jo / TestSupplier123!
-- 3. supplier3@contractors.jo / TestSupplier123!
-- ================================================

-- Supplier 1: مواد البناء الأردنية
INSERT INTO suppliers (
  id,
  owner_id,
  business_name,
  business_name_en,
  contact_phone,
  contact_email,
  warehouse_latitude,
  warehouse_longitude,
  zone_a_radius_km,
  zone_b_radius_km,
  zone_a_fee_jod,
  zone_b_fee_jod,
  is_verified,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  -- Note: Replace with actual auth user ID after creating user
  (SELECT id FROM auth.users WHERE email = 'supplier1@contractors.jo'),
  'مواد البناء الأردنية',
  'Jordan Building Materials',
  '+962791111111',
  'supplier1@contractors.jo',
  31.9566,
  35.9450,
  15.0,
  30.0,
  3.00,
  7.00,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (owner_id) DO NOTHING;

-- Supplier 2: المورد الذهبي
INSERT INTO suppliers (
  id,
  owner_id,
  business_name,
  business_name_en,
  contact_phone,
  contact_email,
  warehouse_latitude,
  warehouse_longitude,
  zone_a_radius_km,
  zone_b_radius_km,
  zone_a_fee_jod,
  zone_b_fee_jod,
  is_verified,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'supplier2@contractors.jo'),
  'المورد الذهبي',
  'Golden Supplier',
  '+962792222222',
  'supplier2@contractors.jo',
  31.9700,
  35.9300,
  20.0,
  40.0,
  3.00,
  7.00,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (owner_id) DO NOTHING;

-- Supplier 3: مستودع الإنشاءات
INSERT INTO suppliers (
  id,
  owner_id,
  business_name,
  business_name_en,
  contact_phone,
  contact_email,
  warehouse_latitude,
  warehouse_longitude,
  zone_a_radius_km,
  zone_b_radius_km,
  zone_a_fee_jod,
  zone_b_fee_jod,
  is_verified,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'supplier3@contractors.jo'),
  'مستودع الإنشاءات',
  'Construction Warehouse',
  '+962793333333',
  'supplier3@contractors.jo',
  31.9500,
  35.9600,
  10.0,
  25.0,
  3.00,
  7.00,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (owner_id) DO NOTHING;

COMMIT;

-- ================================================
-- Quick way to run this:
-- ================================================
--
-- Option 1: Via psql
-- PGPASSWORD="5822075Mahmoud94$" psql "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" -f supabase/seed-test-data.sql
--
-- Option 2: Via Supabase Dashboard
-- 1. Go to SQL Editor
-- 2. Paste this entire file
-- 3. Run
--
-- ================================================

-- Test query to verify suppliers were created:
-- SELECT id, business_name, business_name_en, is_verified FROM suppliers ORDER BY created_at DESC LIMIT 3;
