-- ============================================
-- FIX: Add Missing Order Status Enum Values
-- Date: January 13, 2025
-- URGENT: Apply to production immediately
-- ============================================
--
-- PROBLEM:
-- The notify_order_status_change() trigger function references
-- 'disputed' and 'awaiting_contractor_confirmation' statuses,
-- but these values don't exist in the production enum.
-- This causes ALL order status updates to fail with:
-- "invalid input value for enum order_status: disputed"
--
-- SOLUTION:
-- Add the missing enum values to allow order updates to proceed.
-- This is safe because we're only ADDING values, not removing any.
--
-- ============================================

-- Step 1: Check current enum values (for verification)
SELECT 'Current enum values:' as info;
SELECT enumlabel as status_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Step 2: Add missing values if they don't exist
DO $$
BEGIN
  -- Add 'disputed' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'disputed'
  ) THEN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed' AFTER 'rejected';
    RAISE NOTICE 'Added "disputed" to order_status enum';
  ELSE
    RAISE NOTICE '"disputed" already exists in enum';
  END IF;

  -- Add 'awaiting_contractor_confirmation' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'awaiting_contractor_confirmation'
  ) THEN
    -- Add after 'in_delivery' to maintain logical flow:
    -- in_delivery → awaiting_contractor_confirmation → delivered
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_contractor_confirmation' AFTER 'in_delivery';
    RAISE NOTICE 'Added "awaiting_contractor_confirmation" to order_status enum';
  ELSE
    RAISE NOTICE '"awaiting_contractor_confirmation" already exists in enum';
  END IF;
END $$;

-- Step 3: Verify the fix
SELECT 'Updated enum values:' as info;
SELECT
  enumlabel as status_value,
  enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Expected final order:
-- 1. pending
-- 2. confirmed
-- 3. in_delivery
-- 4. awaiting_contractor_confirmation (NEW)
-- 5. delivered
-- 6. completed
-- 7. cancelled
-- 8. rejected
-- 9. disputed (NEW)

-- ============================================
-- VERIFICATION TEST
-- ============================================
-- After applying this fix, test the order update:

-- Test that we can now reference these statuses
SELECT
  'Test disputed:' as test,
  'disputed'::order_status as can_cast_disputed,
  'Test awaiting:' as test2,
  'awaiting_contractor_confirmation'::order_status as can_cast_awaiting;

-- ============================================
-- SUCCESS CRITERIA
-- ============================================
-- ✅ Both new enum values are added
-- ✅ No errors when casting to these values
-- ✅ Order status updates work without "invalid enum" error
-- ✅ Contractor can confirm delivery successfully