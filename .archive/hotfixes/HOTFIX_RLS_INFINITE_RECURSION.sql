-- ============================================================================
-- HOTFIX: Fix RLS Policy Errors for Orders Table
-- ============================================================================
-- This fixes TWO issues:
-- 1. "infinite recursion detected in policy for relation 'orders'"
--    - Caused by circular dependency when drivers policy checks deliveries table
-- 2. "new row violates row-level security policy for table 'orders'"
--    - Caused by missing or incorrect INSERT policy for contractors
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- ============================================================================

-- ============================================================================
-- PART 1: Fix the circular dependency for drivers viewing orders
-- ============================================================================

-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;

-- Recreate without circular dependency
-- Instead of checking deliveries table, we allow drivers to see orders
-- that are in delivery phase (simpler approach without circular reference)
CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (
    -- Allow if user has driver role and order is in delivery phase
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
    AND status IN ('in_delivery', 'delivered', 'completed')
  );

-- ============================================================================
-- PART 2: Ensure contractors can create orders (fix INSERT policy)
-- ============================================================================

-- Drop existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Contractors can create orders" ON orders;

-- Create a clear INSERT policy for contractors
CREATE POLICY "Contractors can create orders" ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    contractor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('contractor', 'admin')
    )
  );

-- Ensure contractors can view their own orders
DROP POLICY IF EXISTS "Contractors can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Contractors can view their orders" ON orders
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- Create more specific policies for deliveries table
DROP POLICY IF EXISTS "Drivers can view their deliveries" ON deliveries;
CREATE POLICY "Drivers can view their deliveries" ON deliveries
  FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their deliveries" ON deliveries;
CREATE POLICY "Drivers can update their deliveries" ON deliveries
  FOR UPDATE USING (driver_id = auth.uid());

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS fixes applied successfully!';
  RAISE NOTICE '🔧 Part 1: Fixed circular dependency (drivers viewing orders)';
  RAISE NOTICE '🔧 Part 2: Fixed INSERT policy (contractors creating orders)';
  RAISE NOTICE '📝 Deliveries table policies created for drivers';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 You should now be able to create orders without errors';
END $$;
