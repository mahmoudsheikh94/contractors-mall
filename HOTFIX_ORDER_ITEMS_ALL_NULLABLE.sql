-- ============================================================================
-- HOTFIX: Make ALL order_items NOT NULL Fields Nullable
-- ============================================================================
-- This makes all NOT NULL fields in order_items nullable to prevent
-- order creation failures while frontend/backend sync up.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- ============================================================================

-- Make all NOT NULL columns nullable
ALTER TABLE order_items ALTER COLUMN product_name DROP NOT NULL;
ALTER TABLE order_items ALTER COLUMN unit DROP NOT NULL;
ALTER TABLE order_items ALTER COLUMN unit_price DROP NOT NULL;
ALTER TABLE order_items ALTER COLUMN total_price DROP NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All order_items fields are now NULLABLE';
  RAISE NOTICE '🎯 Orders can now be created regardless of which fields are sent';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: After applying this, refresh your browser to load the updated frontend code!';
END $$;
