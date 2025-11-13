-- ============================================
-- Fix Stuck Delivered Orders
-- Date: January 13, 2025
-- ============================================
--
-- This script updates orders that are stuck in 'delivered' status
-- when they should be 'completed' (payment has been released).
--
-- Safe to run multiple times (idempotent)
-- ============================================

\echo '============================================'
\echo '    FIX STUCK DELIVERED ORDERS'
\echo '============================================'
\echo ''

-- 1. Show current state
\echo '1. Current state of stuck orders:'
\echo '   Orders in "delivered" status with "released" payments:'
\echo ''

SELECT
  o.id,
  o.order_number,
  o.status as order_status,
  p.status as payment_status,
  o.created_at,
  o.updated_at
FROM orders o
INNER JOIN payments p ON p.order_id = o.id
WHERE o.status = 'delivered'
  AND p.status = 'released'
ORDER BY o.created_at DESC;

\echo ''
\echo '2. Count of affected orders:'
SELECT COUNT(*) as stuck_orders_count
FROM orders o
INNER JOIN payments p ON p.order_id = o.id
WHERE o.status = 'delivered'
  AND p.status = 'released';

\echo ''
\echo '============================================'
\echo '   APPLYING FIX'
\echo '============================================'
\echo ''

-- 3. Update orders to completed status
\echo '3. Updating orders to completed status...'
\echo ''

WITH updated_orders AS (
  UPDATE orders o
  SET
    status = 'completed',
    updated_at = NOW()
  FROM payments p
  WHERE p.order_id = o.id
    AND o.status = 'delivered'
    AND p.status = 'released'
  RETURNING o.id, o.order_number, o.supplier_id, o.contractor_id
)
SELECT
  COUNT(*) as updated_count,
  STRING_AGG(order_number, ', ') as updated_orders
FROM updated_orders;

\echo ''
\echo '4. Creating activity logs for updated orders...'
\echo ''

-- 4. Create order activity logs for the updates
INSERT INTO order_activities (
  order_id,
  activity_type,
  description,
  metadata,
  created_by,
  created_at
)
SELECT
  o.id,
  'order_completed_data_fix',
  'Order status updated from delivered to completed (data fix for stuck orders)',
  jsonb_build_object(
    'fixed_at', NOW(),
    'previous_status', 'delivered',
    'new_status', 'completed',
    'payment_status', p.status,
    'payment_released_at', p.released_at,
    'script', 'fix-stuck-delivered-orders.sql'
  ),
  o.contractor_id,
  NOW()
FROM orders o
INNER JOIN payments p ON p.order_id = o.id
WHERE o.status = 'completed'
  AND p.status = 'released'
  AND NOT EXISTS (
    SELECT 1 FROM order_activities oa
    WHERE oa.order_id = o.id
      AND oa.activity_type = 'order_completed_data_fix'
  );

\echo ''
\echo '============================================'
\echo '   VERIFICATION'
\echo '============================================'
\echo ''

-- 5. Verify the fix
\echo '5. Verification - Orders that should now be completed:'
\echo ''

SELECT
  o.id,
  o.order_number,
  o.status as order_status,
  p.status as payment_status,
  o.updated_at
FROM orders o
INNER JOIN payments p ON p.order_id = o.id
WHERE o.status = 'completed'
  AND p.status = 'released'
ORDER BY o.updated_at DESC
LIMIT 20;

\echo ''
\echo '6. Check for remaining stuck orders:'
\echo ''

SELECT
  COUNT(*) as remaining_stuck_orders
FROM orders o
INNER JOIN payments p ON p.order_id = o.id
WHERE o.status = 'delivered'
  AND p.status = 'released';

\echo ''
\echo '============================================'
\echo '   ✅ FIX COMPLETE'
\echo '============================================'
\echo ''
\echo 'Summary:'
\echo '- All delivered orders with released payments updated to completed'
\echo '- Activity logs created for audit trail'
\echo '- Orders now eligible for invoice generation'
\echo ''
