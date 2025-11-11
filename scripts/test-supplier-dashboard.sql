-- Test Supplier Dashboard Data
-- Login: supplier1@contractors.jo

-- 1. Get supplier info
SELECT 
  s.id,
  s.business_name,
  s.email,
  p.phone,
  p.full_name
FROM suppliers s
JOIN profiles p ON p.id = s.owner_id
WHERE s.email = 'supplier1@contractors.jo';

-- 2. Check orders for supplier1
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.total_jod,
  o.scheduled_delivery_date,
  o.scheduled_delivery_time,
  o.notes,
  o.created_at
FROM orders o
JOIN suppliers s ON s.id = o.supplier_id
WHERE s.email = 'supplier1@contractors.jo'
ORDER BY o.created_at DESC;

-- 3. Check products
SELECT 
  p.id,
  p.name_ar,
  p.name_en,
  p.price_per_unit,
  p.stock_quantity,
  p.is_available
FROM products p
JOIN suppliers s ON s.id = p.supplier_id
WHERE s.email = 'supplier1@contractors.jo';

-- 4. Check payments
SELECT 
  pay.id,
  pay.order_id,
  o.order_number,
  pay.status,
  pay.amount_jod,
  pay.created_at
FROM payments pay
JOIN orders o ON o.id = pay.order_id
JOIN suppliers s ON s.id = o.supplier_id
WHERE s.email = 'supplier1@contractors.jo'
ORDER BY pay.created_at DESC;

-- 5. Check deliveries
SELECT 
  d.id,
  o.order_number,
  d.status,
  d.confirmation_method,
  d.delivered_at
FROM deliveries d
JOIN orders o ON o.id = d.order_id
JOIN suppliers s ON s.id = o.supplier_id
WHERE s.email = 'supplier1@contractors.jo'
ORDER BY d.created_at DESC;
