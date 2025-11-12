-- ==========================================
-- Check Production Order Status Enum Values
-- ==========================================

-- 1. List all current enum values in production
SELECT
  e.enumlabel as status_value,
  e.enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Expected production values (without 'disputed'):
-- pending, confirmed, in_delivery, delivered, completed, cancelled, rejected

-- Missing values that need to be added:
-- disputed, awaiting_contractor_confirmation


-- 2. Check if specific values exist
SELECT
  'disputed' as checking_value,
  EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'disputed'
  ) as exists_in_enum;

-- 3. Check current status of the problematic order
SELECT
  id,
  order_number,
  status,
  updated_at
FROM orders
WHERE order_number = 'ORD-20251112-20935';