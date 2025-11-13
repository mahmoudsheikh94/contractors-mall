-- ============================================
-- COMPREHENSIVE ENUM DIAGNOSTIC
-- Date: January 13, 2025
-- Purpose: Identify all enum discrepancies
-- ============================================

\echo '================================================'
\echo '    ENUM DIAGNOSTIC REPORT'
\echo '================================================'
\echo ''

-- ============================================
-- PART 1: Current Production Enum Values
-- ============================================

\echo '1. ORDER_STATUS enum:'
\echo '--------------------'
SELECT
  enumlabel as value,
  enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;

\echo ''
\echo '2. PAYMENT_STATUS enum:'
\echo '--------------------'
SELECT
  enumlabel as value,
  enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'payment_status'
ORDER BY e.enumsortorder;

\echo ''
\echo '3. DISPUTE_STATUS enum:'
\echo '--------------------'
SELECT
  enumlabel as value,
  enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'dispute_status'
ORDER BY e.enumsortorder;

\echo ''
\echo '4. USER_ROLE enum:'
\echo '--------------------'
SELECT
  enumlabel as value,
  enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

\echo ''
\echo '5. INVOICE_STATUS enum:'
\echo '--------------------'
SELECT
  enumlabel as value,
  enumsortorder as position
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'invoice_status'
ORDER BY e.enumsortorder;

-- ============================================
-- PART 2: Check Actual Data Usage
-- ============================================

\echo ''
\echo '================================================'
\echo '    ACTUAL DATA ANALYSIS'
\echo '================================================'
\echo ''

\echo '6. Order statuses currently in use:'
\echo '--------------------'
SELECT
  status,
  COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '7. Payment statuses currently in use:'
\echo '--------------------'
SELECT
  status,
  COUNT(*) as count
FROM payments
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '8. Dispute statuses currently in use:'
\echo '--------------------'
SELECT
  status,
  COUNT(*) as count
FROM disputes
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- PART 3: Expected Values (From Code Analysis)
-- ============================================

\echo ''
\echo '================================================'
\echo '    EXPECTED VALUES (from code analysis)'
\echo '================================================'
\echo ''

\echo 'order_status SHOULD have:'
\echo '  - pending'
\echo '  - confirmed'
\echo '  - in_delivery'
\echo '  - awaiting_contractor_confirmation'
\echo '  - delivered'
\echo '  - completed'
\echo '  - cancelled'
\echo '  - rejected'
\echo '  - disputed'
\echo ''

\echo 'payment_status SHOULD have:'
\echo '  - pending'
\echo '  - held (OR escrow_held - need to verify which is correct)'
\echo '  - released'
\echo '  - refunded'
\echo '  - failed'
\echo '  - frozen'
\echo ''

-- ============================================
-- PART 4: Test Casting Common Values
-- ============================================

\echo '================================================'
\echo '    CAST TESTS'
\echo '================================================'
\echo ''

DO $$
BEGIN
  -- Test order_status values
  \echo 'Testing order_status values:'
  BEGIN
    PERFORM 'disputed'::order_status;
    RAISE NOTICE '✅ disputed: OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ disputed: MISSING';
  END;

  BEGIN
    PERFORM 'awaiting_contractor_confirmation'::order_status;
    RAISE NOTICE '✅ awaiting_contractor_confirmation: OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ awaiting_contractor_confirmation: MISSING';
  END;

  BEGIN
    PERFORM 'rejected'::order_status;
    RAISE NOTICE '✅ rejected: OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ rejected: MISSING';
  END;

  -- Test payment_status values
  \echo ''
  \echo 'Testing payment_status values:'

  BEGIN
    PERFORM 'held'::payment_status;
    RAISE NOTICE '✅ held: OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ held: MISSING';
  END;

  BEGIN
    PERFORM 'escrow_held'::payment_status;
    RAISE NOTICE '✅ escrow_held: OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ escrow_held: MISSING';
  END;

  BEGIN
    PERFORM 'frozen'::payment_status;
    RAISE NOTICE '✅ frozen: OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ frozen: MISSING';
  END;

  BEGIN
    PERFORM 'completed'::payment_status;
    RAISE NOTICE '✅ completed: OK (WARNING: This should NOT exist for payments!)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ completed: CORRECTLY MISSING (this is only for orders)';
  END;
END $$;

\echo ''
\echo '================================================'
\echo '    END OF DIAGNOSTIC'
\echo '================================================'
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Review the enum values above'
\echo '2. Compare with expected values'
\echo '3. Run fix-all-enums-production.sql to fix issues'
\echo ''
