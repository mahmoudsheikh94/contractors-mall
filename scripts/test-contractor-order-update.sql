-- =============================================
-- COMPREHENSIVE TEST: Contractor Order Update
-- Date: January 13, 2025
-- =============================================
--
-- PURPOSE:
-- Deep diagnosis to find EXACTLY why contractor order update fails
-- even after RLS policy was applied.
--
-- USAGE:
-- Run this script in Supabase SQL Editor while logged in as:
-- 1. First as ADMIN (to see the full picture)
-- 2. Then as the CONTRACTOR who owns the order (to see the actual error)
--
-- =============================================

\echo '=========================================='
\echo 'TEST 1: Verify RLS Policy Exists'
\echo '=========================================='

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'orders'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Expected: Should see "Contractors can update order status on delivery confirmation"


\echo ''
\echo '=========================================='
\echo 'TEST 2: Check RLS is Enabled on Orders'
\echo '=========================================='

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders'
  AND schemaname = 'public';

-- Expected: rls_enabled = true


\echo ''
\echo '=========================================='
\echo 'TEST 3: Examine Specific Order Data'
\echo '=========================================='

-- Replace with actual order ID: ORD-20251112-20935
WITH order_lookup AS (
  SELECT id FROM orders WHERE order_number = 'ORD-20251112-20935'
)
SELECT
  o.id,
  o.order_number,
  o.contractor_id,
  o.supplier_id,
  o.status as current_status,
  o.total_jod,
  -- Check contractor info
  p.id as contractor_profile_id,
  p.email as contractor_email,
  p.role as contractor_role,
  -- Check delivery status
  d.supplier_confirmed,
  d.contractor_confirmed,
  d.completed_at
FROM orders o
LEFT JOIN profiles p ON p.id = o.contractor_id
LEFT JOIN deliveries d ON d.order_id = o.id
WHERE o.id = (SELECT id FROM order_lookup);

-- Note the contractor_id - this is what auth.uid() must match


\echo ''
\echo '=========================================='
\echo 'TEST 4: Check Current Auth Context'
\echo '=========================================='

SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.email() as current_email;

-- CRITICAL: This shows who YOU are currently authenticated as
-- For the update to work, auth.uid() MUST match contractor_id from Test 3


\echo ''
\echo '=========================================='
\echo 'TEST 5: Test Policy Conditions Manually'
\echo '=========================================='

-- This simulates the USING clause check
WITH order_lookup AS (
  SELECT id FROM orders WHERE order_number = 'ORD-20251112-20935'
)
SELECT
  'Policy USING clause evaluation:' as test_name,
  contractor_id = auth.uid() as contractor_owns_order,
  status = 'awaiting_contractor_confirmation' as correct_status,
  (contractor_id = auth.uid() AND status = 'awaiting_contractor_confirmation') as using_clause_passes
FROM orders
WHERE id = (SELECT id FROM order_lookup);

-- Expected: using_clause_passes = true (if logged in as contractor)


\echo ''
\echo '=========================================='
\echo 'TEST 6: Attempt the Actual UPDATE'
\echo '=========================================='

-- This is the EXACT update the API tries to do
-- Replace with actual order ID
BEGIN;

UPDATE orders
SET
  status = 'delivered',
  updated_at = NOW()
WHERE order_number = 'ORD-20251112-20935';

-- If this fails, you'll see the exact error message
-- If it succeeds, we'll rollback to not actually change data

ROLLBACK; -- Don't actually commit, just test

-- Try again but show the result
WITH order_lookup AS (
  SELECT id FROM orders WHERE order_number = 'ORD-20251112-20935'
)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM orders
      WHERE id = (SELECT id FROM order_lookup)
        AND contractor_id = auth.uid()
        AND status = 'awaiting_contractor_confirmation'
    ) THEN 'Policy conditions are met - update should work'
    WHEN NOT EXISTS (
      SELECT 1 FROM orders WHERE id = (SELECT id FROM order_lookup)
    ) THEN 'ERROR: Order not found'
    WHEN EXISTS (
      SELECT 1 FROM orders
      WHERE id = (SELECT id FROM order_lookup)
        AND contractor_id != auth.uid()
    ) THEN 'ERROR: You do not own this order (contractor_id mismatch)'
    WHEN EXISTS (
      SELECT 1 FROM orders
      WHERE id = (SELECT id FROM order_lookup)
        AND status != 'awaiting_contractor_confirmation'
    ) THEN 'ERROR: Order status is not awaiting_contractor_confirmation'
    ELSE 'ERROR: Unknown issue'
  END as diagnosis;


\echo ''
\echo '=========================================='
\echo 'TEST 7: Check for Conflicting Policies'
\echo '=========================================='

-- Sometimes multiple policies can conflict
SELECT
  policyname,
  permissive,
  cmd,
  qual::text
FROM pg_policies
WHERE tablename = 'orders'
  AND cmd IN ('ALL', 'UPDATE')
ORDER BY policyname;


\echo ''
\echo '=========================================='
\echo 'TEST 8: Check Table Ownership and Grants'
\echo '=========================================='

SELECT
  tablename,
  tableowner,
  has_table_privilege('authenticated', 'orders', 'UPDATE') as can_authenticated_update
FROM pg_tables
WHERE tablename = 'orders'
  AND schemaname = 'public';


\echo ''
\echo '=========================================='
\echo 'INTERPRETATION GUIDE'
\echo '=========================================='

\echo ''
\echo 'If TEST 1 shows no contractor policy → Policy was not created'
\echo 'If TEST 2 shows rls_enabled = false → RLS is disabled (rare)'
\echo 'If TEST 4 auth.uid() is NULL → You are not authenticated'
\echo 'If TEST 4 auth.uid() != contractor_id from TEST 3 → Logged in as wrong user'
\echo 'If TEST 5 using_clause_passes = false → Policy conditions not met'
\echo 'If TEST 6 fails with permission error → RLS policy blocking'
\echo 'If TEST 6 fails with different error → Check error message'
\echo 'If TEST 7 shows conflicting policies → May need to adjust policy order'
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Run this script as the contractor user (not admin)'
\echo '2. Note which test fails'
\echo '3. Share the output to identify the exact issue'
\echo ''
