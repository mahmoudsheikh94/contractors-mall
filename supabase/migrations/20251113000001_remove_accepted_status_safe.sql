-- ==========================================
-- Remove 'accepted' Order Status (Safe Version)
-- Date: January 13, 2025
-- ==========================================
--
-- This migration safely removes the 'accepted' status if it exists.
-- If 'accepted' doesn't exist in the enum, the migration will complete successfully.
--
-- SIMPLIFIED FLOW:
-- pending → confirmed → in_delivery → awaiting_contractor_confirmation → delivered → completed
--
-- ACTIONS:
-- 1. Check if 'accepted' exists in the enum
-- 2. If yes, convert all 'accepted' orders to 'confirmed' and rebuild enum
-- 3. If no, skip (already in correct state)
-- ==========================================

DO $$
DECLARE
  has_accepted BOOLEAN;
  updated_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Check if 'accepted' exists in the order_status enum
  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status'
    AND e.enumlabel = 'accepted'
  ) INTO has_accepted;

  IF has_accepted THEN
    RAISE NOTICE 'Found "accepted" status in enum. Proceeding with migration...';

    -- Step 1: Convert all 'accepted' orders to 'confirmed'
    UPDATE orders
    SET status = 'confirmed'
    WHERE status = 'accepted';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Converted % orders from "accepted" to "confirmed"', updated_count;

    -- Step 2: Rebuild enum without 'accepted'
    -- Create new enum without 'accepted'
    CREATE TYPE order_status_new AS ENUM (
      'pending',
      'confirmed',
      'in_delivery',
      'delivered',
      'completed',
      'cancelled',
      'rejected',
      'disputed',
      'awaiting_contractor_confirmation'
    );

    -- Update orders table to use new enum
    ALTER TABLE orders
      ALTER COLUMN status TYPE order_status_new
      USING status::text::order_status_new;

    -- Drop old enum and rename new one
    DROP TYPE order_status;
    ALTER TYPE order_status_new RENAME TO order_status;

    RAISE NOTICE 'Successfully removed "accepted" from order_status enum';
  ELSE
    RAISE NOTICE '"accepted" status does not exist in enum. Migration already applied or not needed.';
  END IF;

  -- Verify final state
  RAISE NOTICE 'Final order_status enum values:';
  FOR rec IN (
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status'
    ORDER BY e.enumsortorder
  ) LOOP
    RAISE NOTICE '  - %', rec.enumlabel;
  END LOOP;
END $$;

-- ==========================================
-- Verification Queries
-- ==========================================
-- Run these after migration to verify:
--
-- 1. Check enum values:
-- SELECT enumlabel
-- FROM pg_enum e
-- JOIN pg_type t ON e.enumtypid = t.oid
-- WHERE t.typname = 'order_status'
-- ORDER BY e.enumsortorder;
--
-- 2. Check order status distribution:
-- SELECT status, COUNT(*)
-- FROM orders
-- GROUP BY status
-- ORDER BY status;
-- ==========================================
