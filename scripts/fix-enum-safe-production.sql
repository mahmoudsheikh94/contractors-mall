-- ============================================
-- SAFE FIX: Add Missing Order Status Enum Values
-- Date: January 13, 2025
-- URGENT: Apply to production immediately
-- ============================================
--
-- This version checks what actually exists in production
-- and adds missing values without assuming any exist
--
-- ============================================

-- Step 1: Check current enum values
SELECT 'Current enum values in production:' as info;
SELECT
enumlabel as status_value,
enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Step 2: Add ALL missing values safely
DO $$
DECLARE
has_cancelled BOOLEAN;
has_rejected BOOLEAN;
has_disputed BOOLEAN;
has_awaiting BOOLEAN;
BEGIN
-- Check what exists
SELECT EXISTS (
  SELECT 1 FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'order_status' AND e.enumlabel = 'cancelled'
) INTO has_cancelled;

SELECT EXISTS (
  SELECT 1 FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'order_status' AND e.enumlabel = 'rejected'
) INTO has_rejected;

SELECT EXISTS (
  SELECT 1 FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'order_status' AND e.enumlabel = 'disputed'
) INTO has_disputed;

SELECT EXISTS (
  SELECT 1 FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'order_status' AND e.enumlabel = 'awaiting_contractor_confirmation'
) INTO has_awaiting;

-- Add 'cancelled' if missing (add after 'completed')
IF NOT has_cancelled THEN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled' AFTER 'completed';
  RAISE NOTICE 'Added "cancelled" to order_status enum';
ELSE
  RAISE NOTICE '"cancelled" already exists';
END IF;

-- Add 'rejected' if missing (add after 'cancelled' if it exists, else after 'completed')
IF NOT has_rejected THEN
  IF has_cancelled THEN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'cancelled';
  ELSE
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'completed';
  END IF;
  RAISE NOTICE 'Added "rejected" to order_status enum';
ELSE
  RAISE NOTICE '"rejected" already exists';
END IF;

-- Add 'disputed' if missing (add at the end)
IF NOT has_disputed THEN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed';
  RAISE NOTICE 'Added "disputed" to order_status enum';
ELSE
  RAISE NOTICE '"disputed" already exists';
END IF;

-- Add 'awaiting_contractor_confirmation' if missing (add after 'in_delivery')
IF NOT has_awaiting THEN
  -- Check if in_delivery exists
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'in_delivery'
  ) THEN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_contractor_confirmation' AFTER 'in_delivery';
  ELSE
    -- If in_delivery doesn't exist, add at the end
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_contractor_confirmation';
  END IF;
  RAISE NOTICE 'Added "awaiting_contractor_confirmation" to order_status enum';
ELSE
  RAISE NOTICE '"awaiting_contractor_confirmation" already exists';
END IF;

END $$;

-- Step 3: Verify all required values now exist
SELECT 'Final enum values after fix:' as info;
SELECT
enumlabel as status_value,
enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Step 4: Test that we can use these values
SELECT 'Testing enum values:' as info;
DO $$
BEGIN
-- Try to cast each value
PERFORM 'disputed'::order_status;
RAISE NOTICE 'Success: Can cast to disputed';

PERFORM 'awaiting_contractor_confirmation'::order_status;
RAISE NOTICE 'Success: Can cast to awaiting_contractor_confirmation';

PERFORM 'rejected'::order_status;
RAISE NOTICE 'Success: Can cast to rejected';

PERFORM 'cancelled'::order_status;
RAISE NOTICE 'Success: Can cast to cancelled';
EXCEPTION
WHEN OTHERS THEN
  RAISE NOTICE 'Error testing enum values: %', SQLERRM;
END $$;

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- All these values should now exist:
-- ✅ pending
-- ✅ confirmed
-- ✅ in_delivery
-- ✅ awaiting_contractor_confirmation
-- ✅ delivered
-- ✅ completed
-- ✅ cancelled
-- ✅ rejected
-- ✅ disputed
--
-- The notify_order_status_change() trigger will no longer fail
-- ============================================