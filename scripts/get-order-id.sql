-- Quick helper to get the UUID for an order by order_number
-- Usage: Replace 'ORD-20251112-20935' with your order number

SELECT
  id as order_uuid,
  order_number,
  contractor_id,
  status,
  created_at
FROM orders
WHERE order_number = 'ORD-20251112-20935';

-- Copy the order_uuid from the result to use in other test scripts
