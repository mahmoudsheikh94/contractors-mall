-- ============================================================================
-- CHECK ORDERS IN DATABASE
-- ============================================================================
-- Run this in Supabase SQL Editor to see which users have orders
-- ============================================================================

-- CONTRACTORS WITH ORDERS
SELECT
  'CONTRACTORS WITH ORDERS' AS section,
  p.email,
  p.full_name,
  'Test123456!' AS password,
  COUNT(o.id) AS order_count,
  STRING_AGG(DISTINCT o.status::text, ', ') AS statuses
FROM orders o
JOIN profiles p ON p.id = o.contractor_id
WHERE p.role = 'contractor'
GROUP BY p.id, p.email, p.full_name
ORDER BY order_count DESC;

-- SUPPLIERS WITH ORDERS
SELECT
  'SUPPLIERS WITH ORDERS' AS section,
  s.email,
  s.business_name,
  s.business_name_en,
  'Test123456!' AS password,
  COUNT(o.id) AS order_count,
  STRING_AGG(DISTINCT o.status::text, ', ') AS statuses
FROM orders o
JOIN suppliers s ON s.id = o.supplier_id
GROUP BY s.id, s.email, s.business_name, s.business_name_en
ORDER BY order_count DESC;

-- ORDER DETAILS BY CONTRACTOR
SELECT
  'CONTRACTOR ORDERS DETAILS' AS section,
  p.email AS contractor_email,
  p.full_name AS contractor_name,
  o.order_number,
  o.status,
  o.total_jod,
  s.business_name AS supplier_name,
  o.created_at
FROM orders o
JOIN profiles p ON p.id = o.contractor_id
JOIN suppliers s ON s.id = o.supplier_id
WHERE p.role = 'contractor'
ORDER BY p.email, o.created_at DESC;

-- ORDER DETAILS BY SUPPLIER
SELECT
  'SUPPLIER ORDERS DETAILS' AS section,
  s.business_name AS supplier_name,
  s.email AS supplier_email,
  o.order_number,
  o.status,
  o.total_jod,
  p.full_name AS contractor_name,
  o.created_at
FROM orders o
JOIN suppliers s ON s.id = o.supplier_id
JOIN profiles p ON p.id = o.contractor_id
ORDER BY s.business_name, o.created_at DESC;

-- TOTAL COUNTS
SELECT
  'TOTALS' AS section,
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT COUNT(DISTINCT contractor_id) FROM orders) AS contractors_with_orders,
  (SELECT COUNT(DISTINCT supplier_id) FROM orders) AS suppliers_with_orders;
