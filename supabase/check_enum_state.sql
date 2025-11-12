-- Check current order_status enum values in production
SELECT enumlabel as status_value, enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

-- Check current order status distribution
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY status;
