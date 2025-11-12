-- =============================================
-- Diagnostic Script: Contractor Order Update Issue
-- Date: January 13, 2025
-- =============================================
--
-- PURPOSE:
-- This script diagnoses why contractors cannot update order status
-- during delivery confirmation, even though the API returns success.
--
-- USAGE:
-- 1. Run this in Supabase SQL Editor
-- 2. Review the output to understand what policies exist
-- 3. Then apply the fix script
--
-- =============================================

-- STEP 1: Check all UPDATE policies on orders table
-- This shows who can currently update orders
SELECT
  policyname as "Policy Name",
  cmd as "Operation",
  roles as "Roles",
  qual::text as "USING Expression (who can attempt update)",
  with_check::text as "WITH CHECK Expression (what values are allowed)"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Expected Output:
-- - "Suppliers can update their orders" - exists
-- - "Contractors can update order status on delivery confirmation" - MISSING (this is the problem!)


-- =============================================
-- STEP 2: Check if the contractor update policy exists
-- This will return 0 if the policy is missing
SELECT COUNT(*) as contractor_update_policy_exists
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
  AND policyname = 'Contractors can update order status on delivery confirmation';

-- Expected Output: 0 (policy doesn't exist)


-- =============================================
-- STEP 3: Find an order in awaiting_contractor_confirmation status
-- We'll use this to test the fix
SELECT
  id,
  order_number,
  contractor_id,
  supplier_id,
  status,
  total_jod,
  created_at
FROM orders
WHERE status = 'awaiting_contractor_confirmation'
ORDER BY created_at DESC
LIMIT 5;

-- Copy one order ID from this result to use in testing


-- =============================================
-- STEP 4: Check delivery confirmation status for that order
-- Replace 'ORDER_ID_HERE' with an actual order ID from Step 3
/*
SELECT
  d.delivery_id,
  d.order_id,
  d.supplier_confirmed,
  d.supplier_confirmed_at,
  d.contractor_confirmed,
  d.contractor_confirmed_at,
  d.completed_at,
  o.status as order_status
FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE d.order_id = 'ORDER_ID_HERE';
*/


-- =============================================
-- DIAGNOSIS SUMMARY
-- =============================================
--
-- If you see:
-- 1. Step 1 shows only "Suppliers can update their orders" → Contractor policy is missing
-- 2. Step 2 returns 0 → Confirms the policy doesn't exist
-- 3. Step 3 shows orders stuck in 'awaiting_contractor_confirmation' → These orders can't be completed
-- 4. Step 4 shows contractor_confirmed = true but order status unchanged → API updated delivery but not order
--
-- NEXT STEP: Apply the fix using fix-contractor-order-update.sql
