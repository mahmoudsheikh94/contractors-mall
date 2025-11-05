-- ============================================
-- Troubleshooting Queries for Admin Portal
-- Purpose: Quick SQL fixes for common issues
-- ============================================

-- ============================================
-- ISSUE -2: Verify Order Management Migration (UPDATED OCT 30, 2025)
-- ============================================

-- Run this to verify that 20251030_create_core_tables.sql was applied correctly:

-- Check 1: Verify orders table has all required columns for Order Management UI
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('vehicle_type', 'rejection_reason', 'delivery_notes', 'supplier_id', 'contractor_id')
ORDER BY column_name;

-- Expected: 5 rows (all the columns should exist)
-- If missing: Run the updated 20251030_create_core_tables.sql migration

-- Check 2: Verify order_items has correct column names (NOT old names)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('item_id', 'total_jod', 'order_item_id', 'subtotal_jod');

-- Expected: item_id and total_jod (NOT order_item_id or subtotal_jod)
-- If you see old names, the table needs to be updated

-- Check 3: CRITICAL - Verify supplier RLS policies exist
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE policyname LIKE '%Suppliers%'
ORDER BY tablename, policyname;

-- Expected: 4 policies
-- - Suppliers can view their orders (orders)
-- - Suppliers can update their orders (orders)
-- - Suppliers can view deliveries (deliveries)
-- - Suppliers can view payments (payments)
-- If missing: Order Management UI will fail with "permission denied" errors!

-- Check 4: Test supplier can query their orders (replace with real supplier_id)
-- First get a supplier_id:
SELECT id, business_name FROM suppliers LIMIT 1;

-- Then test the query (replace YOUR-SUPPLIER-ID):
SELECT order_id, order_number, status, total_jod
FROM orders
WHERE supplier_id = 'YOUR-SUPPLIER-ID'
LIMIT 5;

-- If this returns "permission denied", RLS policies are missing!

-- ============================================
-- FIX: If order_items has wrong column names
-- ============================================

-- If you have old column names (order_item_id, subtotal_jod), rename them:
/*
ALTER TABLE order_items RENAME COLUMN order_item_id TO item_id;
ALTER TABLE order_items RENAME COLUMN subtotal_jod TO total_jod;
*/

-- ============================================
-- FIX: If orders table missing new columns
-- ============================================

-- Add missing columns if they don't exist:
/*
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
*/

-- ============================================
-- ISSUE -1: Type or relation already exists
-- ============================================

-- ERROR: type "user_role" already exists
-- ERROR: relation "profiles" already exists
-- ERROR: relation "idx_profiles_role" already exists
-- etc.

-- CAUSE: You ran the migration before and it partially completed
-- FIX: Already fixed! The migration is now FULLY IDEMPOTENT

-- The updated migration includes:
-- ✅ Enum creation wrapped in IF NOT EXISTS checks
-- ✅ All CREATE TABLE statements use IF NOT EXISTS
-- ✅ All CREATE INDEX statements use IF NOT EXISTS

-- Just re-run the updated initial_schema.sql - it will:
-- - Skip any objects that already exist
-- - Create any missing objects
-- - Complete successfully!


-- ============================================
-- ISSUE 0: Syntax error "SPATIAL" in initial_schema.sql
-- ============================================

-- ERROR: syntax error at or near "SPATIAL"
-- LINE 79: CREATE SPATIAL INDEX idx_suppliers_location...

-- CAUSE: PostgreSQL doesn't use "SPATIAL" keyword (that's MySQL syntax)
-- FIX: Already fixed in the file! Just remove "SPATIAL" word

-- Correct syntax for PostgreSQL/PostGIS:
-- CREATE INDEX idx_suppliers_location ON suppliers USING GIST(location);

-- If you already have the error, you can manually create the index:
CREATE INDEX IF NOT EXISTS idx_suppliers_location ON suppliers USING GIST(location);


-- ============================================
-- ISSUE 1: "scheduled_date" column does not exist
-- ============================================

-- Check if deliveries table exists and what columns it has:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deliveries'
ORDER BY ordinal_position;

-- If scheduled_date is missing, add it:
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_time_slot TEXT;

-- Verify it worked:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'deliveries'
  AND column_name IN ('scheduled_date', 'scheduled_time_slot');


-- ============================================
-- ISSUE 2: Table "deliveries" does not exist at all
-- ============================================

-- Check if table exists:
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'deliveries';

-- If it doesn't exist, you need to run the migration:
-- Open: supabase/migrations/20251030_create_core_tables.sql
-- Copy and paste it into Supabase SQL Editor


-- ============================================
-- ISSUE 3: Dashboard queries failing
-- ============================================

-- Test each dashboard query individually:

-- 1. Test total orders count:
SELECT COUNT(*) as total_orders
FROM orders
WHERE supplier_id = 'YOUR-SUPPLIER-ID'; -- Replace with actual supplier ID

-- 2. Test active products count:
SELECT COUNT(*) as active_products
FROM products
WHERE supplier_id = 'YOUR-SUPPLIER-ID'
  AND is_available = true;

-- 3. Test total earnings:
SELECT COALESCE(SUM(amount_jod), 0) as total_earnings
FROM payments
WHERE status = 'released'
  AND order_id IN (
    SELECT order_id FROM orders WHERE supplier_id = 'YOUR-SUPPLIER-ID'
  );

-- 4. Test today's orders:
SELECT COUNT(*) as today_orders
FROM orders
WHERE supplier_id = 'YOUR-SUPPLIER-ID'
  AND DATE(created_at) = CURRENT_DATE;

-- 5. Test pending orders:
SELECT COUNT(*) as pending_orders
FROM orders
WHERE supplier_id = 'YOUR-SUPPLIER-ID'
  AND status = 'confirmed';

-- 6. Test today's deliveries:
SELECT COUNT(*) as today_deliveries
FROM deliveries
WHERE scheduled_date = CURRENT_DATE
  AND order_id IN (
    SELECT order_id FROM orders WHERE supplier_id = 'YOUR-SUPPLIER-ID'
  );


-- ============================================
-- ISSUE 4: Get supplier_id for testing
-- ============================================

-- Find supplier ID by email:
SELECT
  s.id as supplier_id,
  s.business_name,
  p.email,
  p.full_name
FROM suppliers s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'your-email@example.com'; -- Replace with your test email


-- ============================================
-- ISSUE 5: "is_verified" not working
-- ============================================

-- Check verification status:
SELECT
  s.id,
  s.business_name,
  s.is_verified,
  s.verified_at,
  p.email
FROM suppliers s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'your-email@example.com';

-- Force verify a supplier:
UPDATE suppliers
SET is_verified = true, verified_at = NOW()
WHERE owner_id = (
  SELECT id FROM profiles WHERE email = 'your-email@example.com'
);


-- ============================================
-- ISSUE 6: Role not set to supplier_admin
-- ============================================

-- Check user role:
SELECT id, email, role
FROM profiles
WHERE email = 'your-email@example.com';

-- Fix role if incorrect:
UPDATE profiles
SET role = 'supplier_admin'
WHERE email = 'your-email@example.com';


-- ============================================
-- ISSUE 7: Missing enum values
-- ============================================

-- Check if order_status enum has all required values:
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'order_status'
ORDER BY enumsortorder;

-- Expected values:
-- pending, confirmed, accepted, in_delivery, delivered, completed, cancelled, rejected, disputed

-- If 'rejected' or 'disputed' are missing, you need to add them:
-- (This requires dropping and recreating the enum, which is complex)
-- Better solution: Use TEXT column instead of enum for order status


-- ============================================
-- ISSUE 8: Missing Phase 4 columns in deliveries
-- ============================================

-- Check if Phase 4 columns exist:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'deliveries'
  AND column_name IN ('photo_url', 'photo_uploaded_at', 'pin_verified_at', 'pin_attempts');

-- Add missing Phase 4 columns:
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_verified_at TIMESTAMPTZ;


-- ============================================
-- ISSUE 9: Missing dispute columns in orders
-- ============================================

-- Check if dispute columns exist:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('disputed_at', 'dispute_reason');

-- Add missing dispute columns:
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT;


-- ============================================
-- ISSUE 10: Suppliers table has wrong structure
-- ============================================

-- Check current suppliers table structure:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'suppliers'
ORDER BY ordinal_position;

-- If zone columns are named incorrectly, rename them:
-- Old names: radius_km_zone_a, radius_km_zone_b
-- New names: zone_a_radius_km, zone_b_radius_km

-- Check if old column names exist:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'suppliers'
  AND column_name IN ('radius_km_zone_a', 'radius_km_zone_b', 'zone_a_radius_km', 'zone_b_radius_km');

-- If you need to rename (only if old names exist):
/*
ALTER TABLE suppliers RENAME COLUMN radius_km_zone_a TO zone_a_radius_km;
ALTER TABLE suppliers RENAME COLUMN radius_km_zone_b TO zone_b_radius_km;
*/


-- ============================================
-- ISSUE 11: Missing required columns in suppliers
-- ============================================

-- Add missing columns if needed:
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS building TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT;


-- ============================================
-- ISSUE 12: Clean slate - drop and recreate all core tables
-- ============================================

-- ⚠️ WARNING: This will DELETE ALL DATA in these tables!
-- Only use this if you want to start completely fresh

-- Uncomment and run if you really want to reset:
/*
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Then run the migration:
-- supabase/migrations/20251030_create_core_tables.sql
*/


-- ============================================
-- ISSUE 13: Check RLS policies are not blocking queries
-- ============================================

-- Temporarily disable RLS for testing (re-enable after!):
/*
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
*/

-- Re-enable RLS after testing:
/*
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
*/


-- ============================================
-- ISSUE 14: Check which migrations have been applied
-- ============================================

-- Supabase tracks migrations in this table:
SELECT *
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- If this table doesn't exist, migrations weren't tracked properly


-- ============================================
-- QUICK HEALTH CHECK
-- ============================================

-- Run this to see overall system health:
SELECT
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT
  'Suppliers',
  COUNT(*)
FROM suppliers

UNION ALL

SELECT
  'Verified Suppliers',
  COUNT(*)
FROM suppliers
WHERE is_verified = true

UNION ALL

SELECT
  'Profiles',
  COUNT(*)
FROM profiles

UNION ALL

SELECT
  'Supplier Admins',
  COUNT(*)
FROM profiles
WHERE role = 'supplier_admin'

UNION ALL

SELECT
  'Orders',
  COUNT(*)
FROM orders

UNION ALL

SELECT
  'Products',
  COUNT(*)
FROM products;


-- ============================================
-- END OF TROUBLESHOOTING QUERIES
-- ============================================
