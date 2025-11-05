-- ============================================
-- Schema Verification Script
-- Purpose: Check if all required tables and columns exist
-- Usage: Run this in Supabase SQL Editor to verify your schema
-- ============================================

-- Step 1: Check which tables exist
SELECT '=== TABLES EXIST CHECK ===' as status;

WITH table_check AS (
  SELECT 'profiles' as table_name, COUNT(*) > 0 as exists
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
  UNION ALL
  SELECT 'suppliers', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'suppliers'
  UNION ALL
  SELECT 'products', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'products'
  UNION ALL
  SELECT 'orders', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'orders'
  UNION ALL
  SELECT 'order_items', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'order_items'
  UNION ALL
  SELECT 'deliveries', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'deliveries'
  UNION ALL
  SELECT 'payments', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'payments'
  UNION ALL
  SELECT 'payment_events', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'payment_events'
)
SELECT
  table_name,
  CASE WHEN exists THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM table_check
ORDER BY table_name;

-- Step 2: Check critical columns for Admin Portal
SELECT '=== CRITICAL COLUMNS CHECK ===' as status;

SELECT
  table_name,
  column_name,
  data_type,
  '✅ EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('role', 'full_name', 'phone'))
    OR (table_name = 'suppliers' AND column_name IN ('business_name', 'is_verified', 'owner_id', 'zone_a_radius_km', 'zone_b_radius_km'))
    OR (table_name = 'orders' AND column_name IN ('status', 'supplier_id', 'contractor_id', 'delivery_date', 'disputed_at'))
    OR (table_name = 'deliveries' AND column_name IN ('scheduled_date', 'scheduled_time_slot', 'photo_url', 'delivery_pin', 'pin_verified_at'))
    OR (table_name = 'payments' AND column_name IN ('status', 'amount_jod', 'held_at', 'released_at'))
    OR (table_name = 'products' AND column_name IN ('supplier_id', 'is_available'))
  )
ORDER BY table_name, column_name;

-- Step 3: Check enums exist
SELECT '=== ENUMS CHECK ===' as status;

SELECT
  t.typname as enum_name,
  COUNT(e.enumlabel) as value_count,
  '✅ EXISTS' as status
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'order_status', 'payment_status')
GROUP BY t.typname
ORDER BY t.typname;

-- Step 4: Show enum values
SELECT '=== ENUM VALUES ===' as status;

SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'order_status', 'payment_status')
ORDER BY t.typname, e.enumsortorder;

-- Step 5: Check RLS is enabled
SELECT '=== ROW LEVEL SECURITY CHECK ===' as status;

SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'deliveries', 'payments', 'suppliers')
ORDER BY tablename;

-- Step 6: Count records in key tables
SELECT '=== TABLE RECORD COUNTS ===' as status;

SELECT
  'profiles' as table_name,
  COUNT(*) as record_count
FROM profiles
UNION ALL
SELECT 'suppliers', COUNT(*)
FROM suppliers
UNION ALL
SELECT 'products', COUNT(*)
FROM products
UNION ALL
SELECT 'orders', COUNT(*)
FROM orders
UNION ALL
SELECT 'deliveries', COUNT(*)
FROM deliveries
UNION ALL
SELECT 'payments', COUNT(*)
FROM payments
ORDER BY table_name;

-- Step 7: Summary
SELECT '=== VERIFICATION COMPLETE ===' as status;
SELECT 'If all checks show ✅, your schema is ready for the Admin Portal!' as message;
