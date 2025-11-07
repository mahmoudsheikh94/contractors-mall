-- ============================================================================
-- FIX: Make vehicle_type Nullable in Orders Table
-- ============================================================================
-- Date: 2025-11-06
-- Issue: After removing vehicle estimation system, vehicle_type column
--        still had NOT NULL constraint causing order submission failures
-- Solution: Make vehicle_type nullable since suppliers handle their own logistics
-- ============================================================================

-- Make vehicle_type nullable
-- This column was added in 20251031_transform_to_new_schema.sql as NOT NULL
-- but is no longer needed since suppliers manage their own vehicle selection
ALTER TABLE orders ALTER COLUMN vehicle_type DROP NOT NULL;

-- Add comment to document that this column is deprecated
COMMENT ON COLUMN orders.vehicle_type IS
'DEPRECATED: Vehicle type for delivery (pickup_1ton, truck_3_5ton, flatbed_5ton).
Now nullable as suppliers handle their own logistics and vehicle selection.
This column remains for backward compatibility but is no longer used in new orders.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration applied: vehicle_type is now nullable';
  RAISE NOTICE '📋 Orders can now be created without specifying vehicle_type';
  RAISE NOTICE '🔧 This fixes: "null value in column vehicle_type violates not-null constraint"';
END $$;