-- ==========================================
-- Remove 'accepted' Order Status
-- Date: January 13, 2025
-- ==========================================
--
-- This migration simplifies the order status flow by removing the redundant
-- 'accepted' status and consolidating it with 'confirmed'.
--
-- PROBLEM:
-- - 'confirmed' and 'accepted' both meant "supplier accepted order"
-- - This created confusion in the UI and workflow
-- - Labels were inconsistent across the application
--
-- SOLUTION:
-- - Remove 'accepted' status entirely
-- - Use 'confirmed' as the single supplier acceptance status
-- - Standardize all labels to "تم تأكيد الطلب" (Order has been confirmed)
--
-- SIMPLIFIED FLOW:
-- pending → confirmed → in_delivery → awaiting_contractor_confirmation → delivered → completed
--
-- ACTIONS:
-- 1. Convert all existing 'accepted' orders to 'confirmed'
-- 2. Remove 'accepted' value from order_status enum
-- ==========================================

-- Step 1: Convert all 'accepted' orders to 'confirmed'
-- This preserves the order state while eliminating the redundant status
UPDATE orders
SET status = 'confirmed'
WHERE status = 'accepted';

-- Log how many orders were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Converted % orders from "accepted" to "confirmed"', updated_count;
END $$;

-- Step 2: Remove 'accepted' from the order_status enum
-- PostgreSQL doesn't support removing enum values directly, so we need to:
-- a) Create a new enum without 'accepted'
-- b) Convert the column to use the new enum
-- c) Drop the old enum and rename the new one

-- Create new enum without 'accepted'
CREATE TYPE order_status_new AS ENUM (
  'pending',
  'confirmed',
  'in_delivery',
  'delivered',
  'completed',
  'cancelled',
  'rejected',
  'disputed',
  'awaiting_contractor_confirmation'
);

-- Update orders table to use new enum
-- USING clause converts text to new enum type
ALTER TABLE orders
  ALTER COLUMN status TYPE order_status_new
  USING status::text::order_status_new;

-- Drop old enum
DROP TYPE order_status;

-- Rename new enum to original name
ALTER TYPE order_status_new RENAME TO order_status;

-- Add comments for documentation
COMMENT ON TYPE order_status IS
  'Order lifecycle statuses. Simplified flow (Jan 2025): pending → confirmed → in_delivery → awaiting_contractor_confirmation → delivered → completed.
   Removed "accepted" status to eliminate redundancy with "confirmed".';

-- Verification: Check that no orders have 'accepted' status
DO $$
DECLARE
  accepted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO accepted_count
  FROM orders
  WHERE status::text = 'accepted';

  IF accepted_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % orders still have "accepted" status', accepted_count;
  ELSE
    RAISE NOTICE 'Migration successful: No orders with "accepted" status found';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: "accepted" status removed from order_status enum';
  RAISE NOTICE 'All orders now use simplified status flow';
END $$;
