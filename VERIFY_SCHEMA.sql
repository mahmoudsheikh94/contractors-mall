-- ============================================================================
-- VERIFY CURRENT DATABASE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to check the current state
-- ============================================================================

-- Check if vehicle_class_id column exists in supplier_zone_fees
SELECT
  'supplier_zone_fees' AS table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'supplier_zone_fees'
ORDER BY ordinal_position;

-- Check constraints on supplier_zone_fees
SELECT
  'Constraints on supplier_zone_fees' AS info,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'supplier_zone_fees';

-- Check if orders.vehicle_class_id is nullable
SELECT
  'orders.vehicle_class_id' AS column_info,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'vehicle_class_id';
