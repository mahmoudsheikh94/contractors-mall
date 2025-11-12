-- =============================================
-- COMPREHENSIVE TEST: Contractor Order Update
-- Date: January 13, 2025
-- Supabase SQL Editor Compatible Version
-- =============================================
--
-- PURPOSE:
-- Deep diagnosis to find EXACTLY why contractor order update fails
-- even after RLS policy was applied.
--
-- USAGE:
-- Run each test section one at a time in Supabase SQL Editor
-- =============================================

-- ==========================================
-- TEST 1: Verify RLS Policy Exists
-- ==========================================

SELECT
  'TEST 1: RLS Policy Check' as test_name,
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


-- ==========================================
-- TEST 2: Check RLS is Enabled on Orders
-- ==========================================

SELECT
  'TEST 2: RLS Enabled Check' as test_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders'
  AND schemaname = 'public';

-- Expected: rls_enabled = true


-- ==========================================
-- TEST 3: Examine Specific Order Data
-- ==========================================

SELECT
  'TEST 3: Order Data' as test_name,
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
WHERE o.order_number = 'ORD-20251112-20935';

-- Note the contractor_id - this is what auth.uid() must match


-- ==========================================
-- TEST 4: Check Current Auth Context
-- ==========================================

SELECT
  'TEST 4: Auth Context' as test_name,
  auth.uid() as current_user_id,
  auth.role() as current_role,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email;

-- CRITICAL: This shows who YOU are currently authenticated as
-- For the update to work, auth.uid() MUST match contractor_id from Test 3


-- ==========================================
-- TEST 5: Test Policy Conditions Manually
-- ==========================================

SELECT
  'TEST 5: Policy Conditions' as test_name,
  contractor_id = auth.uid() as contractor_owns_order,
  status = 'awaiting_contractor_confirmation' as correct_status,
  (contractor_id = auth.uid() AND status = 'awaiting_contractor_confirmation') as using_clause_passes,
  contractor_id as order_contractor_id,
  auth.uid() as current_user_id
FROM orders
WHERE order_number = 'ORD-20251112-20935';

-- Expected: using_clause_passes = true (if logged in as contractor)


-- ==========================================
-- TEST 6: Check What User Can See
-- ==========================================

SELECT
  'TEST 6: Visibility Check' as test_name,
  COUNT(*) as orders_visible_to_me
FROM orders
WHERE order_number = 'ORD-20251112-20935';

-- If this returns 0, the SELECT policy is blocking you from seeing the order


-- ==========================================
-- TEST 7: Attempt the Actual UPDATE (DRY RUN)
-- ==========================================

-- First, let's see if the WHERE clause would match any rows
SELECT
  'TEST 7: Update Match Check' as test_name,
  EXISTS (
    SELECT 1 FROM orders
    WHERE order_number = 'ORD-20251112-20935'
      AND contractor_id = auth.uid()
      AND status = 'awaiting_contractor_confirmation'
  ) as would_update_any_rows;

-- If this returns false, the UPDATE won't match any rows


-- ==========================================
-- TEST 8: Detailed Policy Evaluation
-- ==========================================

SELECT
  'TEST 8: Policy Evaluation Details' as test_name,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'ORD-20251112-20935')
      THEN 'ERROR: Order not found'
    WHEN NOT EXISTS (
      SELECT 1 FROM orders
      WHERE order_number = 'ORD-20251112-20935'
        AND contractor_id = auth.uid()
    )
      THEN 'ERROR: You do not own this order (contractor_id mismatch)'
    WHEN NOT EXISTS (
      SELECT 1 FROM orders
      WHERE order_number = 'ORD-20251112-20935'
        AND status = 'awaiting_contractor_confirmation'
    )
      THEN 'ERROR: Order status is not awaiting_contractor_confirmation'
    WHEN NOT EXISTS (
      SELECT 1 FROM orders
      WHERE order_number = 'ORD-20251112-20935'
        AND contractor_id = auth.uid()
        AND status = 'awaiting_contractor_confirmation'
    )
      THEN 'ERROR: Both conditions must be met'
    ELSE 'SUCCESS: All policy conditions are met'
  END as diagnosis,
  (SELECT status FROM orders WHERE order_number = 'ORD-20251112-20935') as current_status,
  (SELECT contractor_id FROM orders WHERE order_number = 'ORD-20251112-20935') as order_contractor_id,
  auth.uid() as your_user_id;


-- ==========================================
-- TEST 9: Check for Conflicting Policies
-- ==========================================

SELECT
  'TEST 9: All Policies on Orders Table' as test_name,
  policyname,
  permissive,
  cmd,
  qual::text as using_expression
FROM pg_policies
WHERE tablename = 'orders'
  AND cmd IN ('ALL', 'UPDATE')
ORDER BY policyname;


-- ==========================================
-- TEST 10: Try Actual Update (WILL ROLLBACK)
-- ==========================================
-- Run this section separately, it will attempt the update and rollback

DO $$
DECLARE
  v_order_id UUID;
  v_result TEXT;
BEGIN
  -- Get order ID
  SELECT id INTO v_order_id
  FROM orders
  WHERE order_number = 'ORD-20251112-20935';

  -- Attempt update
  BEGIN
    UPDATE orders
    SET status = 'delivered', updated_at = NOW()
    WHERE id = v_order_id;

    -- Check if any rows were affected
    IF FOUND THEN
      v_result := 'SUCCESS: Update would work (rolling back)';
    ELSE
      v_result := 'WARNING: Update succeeded but matched 0 rows';
    END IF;

    -- Always rollback
    RAISE EXCEPTION 'Rollback (this is expected)';

  EXCEPTION
    WHEN insufficient_privilege THEN
      v_result := 'ERROR: PostgreSQL permission denied - RLS blocking';
    WHEN OTHERS THEN
      IF SQLERRM = 'Rollback (this is expected)' THEN
        RAISE NOTICE '%', v_result;
      ELSE
        RAISE NOTICE 'ERROR: %', SQLERRM;
      END IF;
  END;

  RAISE EXCEPTION 'Rollback transaction';
END $$;


-- ==========================================
-- INTERPRETATION GUIDE
-- ==========================================
--
-- TEST 1: If you don't see "Contractors can update order status on delivery confirmation"
--         → The RLS policy was not created
--
-- TEST 2: If rls_enabled = false
--         → RLS is disabled (very rare)
--
-- TEST 3: Note the contractor_id value
--
-- TEST 4: auth.uid() should match contractor_id from TEST 3
--         If NULL → You're not authenticated
--         If different → You're logged in as wrong user
--
-- TEST 5: using_clause_passes should be TRUE
--         If FALSE → Policy conditions not met
--
-- TEST 6: Should return 1
--         If 0 → SELECT policy is blocking you
--
-- TEST 7: should_update should be TRUE
--         If FALSE → UPDATE WHERE clause won't match
--
-- TEST 8: Should say "SUCCESS: All policy conditions are met"
--
-- TEST 9: Check if there are conflicting policies
--
-- TEST 10: Will attempt actual update and show exact error
