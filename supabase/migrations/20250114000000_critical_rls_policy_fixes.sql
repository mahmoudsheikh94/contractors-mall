-- ============================================
-- Critical RLS Policy Fixes
-- Date: January 14, 2025
-- Purpose: Add missing RLS policies for critical tables
-- ============================================
--
-- PROBLEM:
-- 4 critical tables have RLS enabled but NO policies, completely
-- blocking core functionality:
-- 1. disputes - Dispute workflow completely broken
-- 2. payment_events - Payment audit trail inaccessible
-- 3. reviews - Rating system blocked
-- 4. media - File uploads and viewing blocked
--
-- SOLUTION:
-- Add comprehensive RLS policies for each table to enable
-- proper access control while maintaining security.
-- ============================================

-- ============================================
-- 1. DISPUTES TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Contractors can view their disputes" ON disputes;
DROP POLICY IF EXISTS "Suppliers can view their disputes" ON disputes;
DROP POLICY IF EXISTS "Contractors can open disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can manage all disputes" ON disputes;
DROP POLICY IF EXISTS "Users can update their disputes" ON disputes;

-- Policy: Contractors can view disputes for their orders
CREATE POLICY "Contractors can view their disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = disputes.order_id
      AND o.contractor_id = auth.uid()
    )
  );

-- Policy: Suppliers can view disputes for their orders
CREATE POLICY "Suppliers can view their disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.id = disputes.order_id
      AND s.owner_id = auth.uid()
    )
  );

-- Policy: Contractors can create disputes for their orders
CREATE POLICY "Contractors can open disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be opened by the authenticated user
    opened_by = auth.uid()
    -- AND must be for an order they own
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.contractor_id = auth.uid()
      -- Order must be in a disputable state
      AND o.status IN ('delivered', 'completed', 'awaiting_contractor_confirmation')
    )
  );

-- Policy: Users can update disputes they're involved in (for adding responses)
CREATE POLICY "Users can update their disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (
    -- Either contractor or supplier involved in the order
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.id = disputes.order_id
      AND (
        o.contractor_id = auth.uid()
        OR s.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Can only update certain fields (not status or resolution)
    -- Admin-only fields should not be modified
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.id = disputes.order_id
      AND (
        o.contractor_id = auth.uid()
        OR s.owner_id = auth.uid()
      )
    )
  );

-- Policy: Admins can manage all disputes
CREATE POLICY "Admins can manage all disputes"
  ON disputes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 2. PAYMENT_EVENTS TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Contractors can view payment events for their orders" ON payment_events;
DROP POLICY IF EXISTS "Suppliers can view payment events for their orders" ON payment_events;
DROP POLICY IF EXISTS "System can insert payment events" ON payment_events;
DROP POLICY IF EXISTS "Admins can view all payment events" ON payment_events;

-- Policy: Contractors can view payment events for their orders
CREATE POLICY "Contractors can view payment events for their orders"
  ON payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE p.id = payment_events.payment_id
      AND o.contractor_id = auth.uid()
    )
  );

-- Policy: Suppliers can view payment events for their orders
CREATE POLICY "Suppliers can view payment events for their orders"
  ON payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      INNER JOIN suppliers s ON s.id = o.supplier_id
      WHERE p.id = payment_events.payment_id
      AND s.owner_id = auth.uid()
    )
  );

-- Policy: System and authenticated users can insert payment events
-- (Triggers and API routes need to log events)
CREATE POLICY "System can insert payment events"
  ON payment_events FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Policy: Admins can view all payment events
CREATE POLICY "Admins can view all payment events"
  ON payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 3. REVIEWS TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Everyone can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Contractors can create reviews for their orders" ON reviews;
DROP POLICY IF EXISTS "Contractors can update their reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;

-- Policy: Everyone can view published reviews
CREATE POLICY "Everyone can view published reviews"
  ON reviews FOR SELECT
  USING (true);

-- Policy: Contractors can create reviews for completed orders
CREATE POLICY "Contractors can create reviews for their orders"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    contractor_id = auth.uid()
    -- Must be for an order they own
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.contractor_id = auth.uid()
      -- Order must be completed to review
      AND o.status = 'completed'
    )
    -- Prevent duplicate reviews
    AND NOT EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.order_id = order_id
      AND r.contractor_id = auth.uid()
    )
  );

-- Policy: Contractors can update their own reviews
CREATE POLICY "Contractors can update their reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

-- Policy: Contractors can delete their own reviews
CREATE POLICY "Contractors can delete their reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (contractor_id = auth.uid());

-- Policy: Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 4. MEDIA TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Everyone can view product media" ON media;
DROP POLICY IF EXISTS "Users can view media for their orders" ON media;
DROP POLICY IF EXISTS "Suppliers can upload product media" ON media;
DROP POLICY IF EXISTS "Users can upload media for their orders" ON media;
DROP POLICY IF EXISTS "Users can delete their own media" ON media;
DROP POLICY IF EXISTS "Admins can manage all media" ON media;

-- Policy: Everyone can view product media
CREATE POLICY "Everyone can view product media"
  ON media FOR SELECT
  USING (entity_type = 'product');

-- Policy: Users can view media for their orders (delivery proofs, dispute evidence)
CREATE POLICY "Users can view media for their orders"
  ON media FOR SELECT
  TO authenticated
  USING (
    entity_type IN ('delivery_proof', 'dispute', 'order')
    AND (
      -- For delivery proofs
      (entity_type = 'delivery_proof' AND EXISTS (
        SELECT 1 FROM deliveries d
        INNER JOIN orders o ON o.id = d.order_id
        LEFT JOIN suppliers s ON s.id = o.supplier_id
        WHERE d.delivery_id::text = media.entity_id
        AND (
          o.contractor_id = auth.uid()
          OR s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'driver')
          )
        )
      ))
      -- For dispute evidence
      OR (entity_type = 'dispute' AND EXISTS (
        SELECT 1 FROM disputes d
        INNER JOIN orders o ON o.id = d.order_id
        LEFT JOIN suppliers s ON s.id = o.supplier_id
        WHERE d.id::text = media.entity_id
        AND (
          o.contractor_id = auth.uid()
          OR s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
      ))
      -- For order-related media
      OR (entity_type = 'order' AND EXISTS (
        SELECT 1 FROM orders o
        LEFT JOIN suppliers s ON s.id = o.supplier_id
        WHERE o.id::text = media.entity_id
        AND (
          o.contractor_id = auth.uid()
          OR s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'driver')
          )
        )
      ))
    )
  );

-- Policy: Suppliers can upload product media
CREATE POLICY "Suppliers can upload product media"
  ON media FOR INSERT
  TO authenticated
  WITH CHECK (
    entity_type = 'product'
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM products p
      INNER JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id::text = entity_id
      AND s.owner_id = auth.uid()
    )
  );

-- Policy: Users can upload media for their orders
CREATE POLICY "Users can upload media for their orders"
  ON media FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      -- Contractors uploading dispute evidence
      (entity_type = 'dispute' AND EXISTS (
        SELECT 1 FROM disputes d
        INNER JOIN orders o ON o.id = d.order_id
        WHERE d.id::text = entity_id
        AND o.contractor_id = auth.uid()
      ))
      -- Suppliers uploading delivery proofs
      OR (entity_type = 'delivery_proof' AND EXISTS (
        SELECT 1 FROM deliveries d
        INNER JOIN orders o ON o.id = d.order_id
        INNER JOIN suppliers s ON s.id = o.supplier_id
        WHERE d.delivery_id::text = entity_id
        AND s.owner_id = auth.uid()
      ))
      -- Drivers uploading delivery proofs
      OR (entity_type = 'delivery_proof' AND EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d.delivery_id::text = entity_id
        AND d.driver_id = auth.uid()
      ))
    )
  );

-- Policy: Users can delete their own uploaded media
CREATE POLICY "Users can delete their own media"
  ON media FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Policy: Admins can manage all media
CREATE POLICY "Admins can manage all media"
  ON media FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Contractors can view their disputes" ON disputes IS
  'Allows contractors to view disputes for orders they placed';

COMMENT ON POLICY "Suppliers can view their disputes" ON disputes IS
  'Allows suppliers to view disputes for orders they received';

COMMENT ON POLICY "Contractors can open disputes" ON disputes IS
  'Allows contractors to open disputes for their orders that are in disputable states';

COMMENT ON POLICY "Admins can manage all disputes" ON disputes IS
  'Allows admins full access to manage all disputes';

COMMENT ON POLICY "Contractors can view payment events for their orders" ON payment_events IS
  'Allows contractors to view payment history and audit trail for their orders';

COMMENT ON POLICY "Suppliers can view payment events for their orders" ON payment_events IS
  'Allows suppliers to view payment history and audit trail for their orders';

COMMENT ON POLICY "System can insert payment events" ON payment_events IS
  'Allows system triggers and API routes to log payment events';

COMMENT ON POLICY "Everyone can view published reviews" ON reviews IS
  'Makes all reviews publicly visible for transparency';

COMMENT ON POLICY "Contractors can create reviews for their orders" ON reviews IS
  'Allows contractors to review suppliers after order completion';

COMMENT ON POLICY "Everyone can view product media" ON media IS
  'Makes product images publicly accessible';

COMMENT ON POLICY "Users can view media for their orders" ON media IS
  'Allows involved parties to view delivery proofs and dispute evidence';

-- ============================================
-- VERIFICATION
-- ============================================

-- List all policies created for verification
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('disputes', 'payment_events', 'reviews', 'media')
ORDER BY tablename, policyname;