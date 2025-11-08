-- ============================================================================
-- HOTFIX: Make order_items Fields Nullable (Temporary)
-- ============================================================================
-- This is a TEMPORARY fix to allow order creation while we ensure
-- all product data is properly passed from the frontend.
--
-- These fields SHOULD contain data for proper order history, but we're
-- making them nullable to prevent blocking order creation.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- ============================================================================

-- ============================================================================
-- Make product_name and unit nullable temporarily
-- ============================================================================

-- Make product_name nullable (currently NOT NULL)
ALTER TABLE order_items ALTER COLUMN product_name DROP NOT NULL;

-- Make unit nullable (currently NOT NULL)
ALTER TABLE order_items ALTER COLUMN unit DROP NOT NULL;

-- Add comments explaining this is temporary
COMMENT ON COLUMN order_items.product_name IS
'Product name at time of order (for historical record).
TEMPORARILY NULLABLE - should contain actual product name for proper order history.';

COMMENT ON COLUMN order_items.unit IS
'Unit of measurement at time of order (e.g., كيس, طن).
TEMPORARILY NULLABLE - should contain actual unit for proper order history.';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TEMPORARY FIX APPLIED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: This is a TEMPORARY fix!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Changes made:';
  RAISE NOTICE '   - product_name is now NULLABLE';
  RAISE NOTICE '   - unit is now NULLABLE';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 This allows orders to be created even if product details are missing.';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Product name and unit SHOULD be provided for:';
  RAISE NOTICE '   - Proper order history preservation';
  RAISE NOTICE '   - Accurate order records';
  RAISE NOTICE '   - Better customer experience';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 The frontend and API have been updated to send this data.';
  RAISE NOTICE '   Once confirmed working, these fields should be made NOT NULL again.';
  RAISE NOTICE '';
END $$;