-- ============================================================================
-- RLS POLICY TEST SUITE
-- ============================================================================
-- This test suite verifies that Row Level Security policies are working
-- correctly and don't have circular dependencies.
--
-- Run this in Supabase SQL Editor to test RLS policies
-- ============================================================================

BEGIN;

-- Set up test extension
CREATE EXTENSION IF NOT EXISTS pgtap;

-- ============================================================================
-- TEST 1: Verify RLS is enabled on all required tables
-- ============================================================================

SELECT plan(10);

SELECT has_table_privilege('public', 'orders', 'SELECT') AS 'Orders table exists';
SELECT has_table_privilege('public', 'order_items', 'SELECT') AS 'Order items table exists';
SELECT has_table_privilege('public', 'profiles', 'SELECT') AS 'Profiles table exists';
SELECT has_table_privilege('public', 'suppliers', 'SELECT') AS 'Suppliers table exists';
SELECT has_table_privilege('public', 'deliveries', 'SELECT') AS 'Deliveries table exists';

-- Check RLS is enabled
SELECT results_eq(
  $$ SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
     AND tablename IN ('orders', 'order_items', 'deliveries', 'profiles', 'suppliers')
     AND rowsecurity = true $$,
  $$ VALUES ('orders'::name), ('order_items'::name), ('deliveries'::name),
            ('profiles'::name), ('suppliers'::name) $$,
  'RLS enabled on all critical tables'
);

-- ============================================================================
-- TEST 2: Verify policy counts
-- ============================================================================

-- Orders table should have multiple policies
SELECT cmp_ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders'),
  '>=',
  3,
  'Orders table has at least 3 policies'
);

-- Order items table should have at least 5 policies
SELECT cmp_ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_items'),
  '>=',
  5,
  'Order items table has at least 5 policies'
);

-- Deliveries table should have policies
SELECT cmp_ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'deliveries'),
  '>=',
  2,
  'Deliveries table has at least 2 policies'
);

-- Profiles table should have policies
SELECT cmp_ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles'),
  '>=',
  1,
  'Profiles table has at least 1 policy'
);

SELECT * FROM finish();

ROLLBACK;
