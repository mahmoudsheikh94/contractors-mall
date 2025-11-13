-- ============================================
-- FIX: Payment Policy - Remove Invalid Enum
-- Date: January 13, 2025
-- ============================================
--
-- The previous policy referenced 'completed' which
-- doesn't exist in payment_status enum.
-- Payment statuses are: pending, held, released, refunded, failed, frozen
--
-- ============================================

\echo 'Fixing payment policy to use only valid payment_status values...'

DROP POLICY IF EXISTS "System can update payments on delivery confirmation" ON payments;

CREATE POLICY "System can update payments on delivery confirmation"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    -- Payment is for an order being confirmed
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
      AND o.status IN ('delivered', 'completed')
      AND (
        o.contractor_id = auth.uid() -- Contractor confirming
        OR EXISTS (                   -- Or supplier confirming
          SELECT 1 FROM suppliers s
          WHERE s.id = o.supplier_id
          AND s.owner_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    -- Can only release or freeze payments (not 'completed' - that's for orders!)
    status IN ('released', 'frozen')
  );

COMMENT ON POLICY "System can update payments on delivery confirmation" ON payments IS
  'Allows contractors and suppliers to update payment status during delivery confirmation. Payment can be released (successful) or frozen (disputed). Order status can be completed, but payment status cannot.';

\echo '✅ Payment policy fixed!'
\echo ''
\echo 'Valid payment_status values:'
SELECT
  enumlabel as value,
  enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'payment_status'
ORDER BY e.enumsortorder;
