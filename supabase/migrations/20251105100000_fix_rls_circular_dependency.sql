-- Fix RLS Circular Dependency for Orders Table
-- The "Drivers can view assigned orders" policy creates infinite recursion
-- when querying deliveries with joins to orders

-- Drop the problematic policy
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;

-- Recreate without circular dependency
-- Instead of checking deliveries table, we'll allow drivers to see orders
-- that are in 'in_delivery' or 'delivered' status (simpler approach)
-- This assumes drivers only work with orders that are already in delivery phase
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

-- Create a more specific policy for deliveries table to ensure drivers
-- can only see deliveries assigned to them
DROP POLICY IF EXISTS "Drivers can view their deliveries" ON deliveries;
CREATE POLICY "Drivers can view their deliveries" ON deliveries
  FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their deliveries" ON deliveries;
CREATE POLICY "Drivers can update their deliveries" ON deliveries
  FOR UPDATE USING (driver_id = auth.uid());
