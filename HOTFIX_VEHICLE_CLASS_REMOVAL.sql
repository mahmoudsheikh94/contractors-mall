-- ============================================================================
-- HOTFIX: Remove vehicle_class_id from supplier_zone_fees
-- ============================================================================
-- This fixes the TypeScript build error in Vercel by aligning database schema
-- with the code expectations.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Step 1: Drop constraints
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_vehicle_class_id_fkey;
ALTER TABLE supplier_zone_fees DROP CONSTRAINT IF EXISTS supplier_zone_fees_supplier_id_zone_vehicle_class_id_key;

-- Step 2: Remove column
ALTER TABLE supplier_zone_fees DROP COLUMN IF EXISTS vehicle_class_id;

-- Step 3: Add new unique constraint
ALTER TABLE supplier_zone_fees
  ADD CONSTRAINT supplier_zone_fees_supplier_zone_unique
  UNIQUE (supplier_id, zone);

-- Step 4: Make vehicle_class_id nullable in orders (if not already)
ALTER TABLE orders ALTER COLUMN vehicle_class_id DROP NOT NULL;

-- Verification
SELECT 'vehicle_class_id' AS column_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'supplier_zone_fees'
         AND column_name = 'vehicle_class_id'
       )
       THEN '❌ Still exists'
       ELSE '✅ Removed successfully'
       END AS status;
