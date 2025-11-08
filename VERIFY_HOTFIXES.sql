-- ============================================================================
-- VERIFICATION SCRIPT FOR APPLIED HOTFIXES
-- ============================================================================
-- Run this in Supabase SQL Editor to verify all hotfixes were applied
-- https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/sql/new
-- ============================================================================

DO $$
DECLARE
  v_orders_policies INTEGER;
  v_order_items_policies INTEGER;
  v_order_items_rls_enabled BOOLEAN;
  v_function_exists BOOLEAN;
  v_vehicle_class_removed BOOLEAN;
  v_product_name_nullable BOOLEAN;
  v_unit_nullable BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 HOTFIX VERIFICATION REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check 1: Orders table RLS policies
  SELECT COUNT(*) INTO v_orders_policies
  FROM pg_policies
  WHERE tablename = 'orders';

  RAISE NOTICE '1️⃣  ORDERS TABLE RLS POLICIES';
  RAISE NOTICE '   Total policies: %', v_orders_policies;
  RAISE NOTICE '   Status: %', CASE WHEN v_orders_policies >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE '';

  -- Check 2: Order items table RLS
  SELECT COUNT(*) INTO v_order_items_policies
  FROM pg_policies
  WHERE tablename = 'order_items';

  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'order_items'
    AND rowsecurity = true
  ) INTO v_order_items_rls_enabled;

  RAISE NOTICE '2️⃣  ORDER_ITEMS TABLE RLS';
  RAISE NOTICE '   RLS enabled: %', CASE WHEN v_order_items_rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '   Total policies: %', v_order_items_policies;
  RAISE NOTICE '   Status: %', CASE WHEN v_order_items_policies >= 5 THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE '';

  -- Check 3: Nullable fields in order_items
  SELECT is_nullable = 'YES' INTO v_product_name_nullable
  FROM information_schema.columns
  WHERE table_name = 'order_items' AND column_name = 'product_name';

  SELECT is_nullable = 'YES' INTO v_unit_nullable
  FROM information_schema.columns
  WHERE table_name = 'order_items' AND column_name = 'unit';

  RAISE NOTICE '3️⃣  ORDER_ITEMS NULLABLE FIELDS';
  RAISE NOTICE '   product_name nullable: %', CASE WHEN v_product_name_nullable THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '   unit nullable: %', CASE WHEN v_unit_nullable THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '   Status: %', CASE WHEN v_product_name_nullable AND v_unit_nullable THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE '';

  -- Check 4: Delivery fee calculation function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_calculate_delivery_fee'
  ) INTO v_function_exists;

  RAISE NOTICE '4️⃣  DELIVERY FEE FUNCTION';
  RAISE NOTICE '   Function exists: %', CASE WHEN v_function_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '   Status: %', CASE WHEN v_function_exists THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE '';

  -- Check 5: Vehicle class removed from supplier_zone_fees
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_zone_fees'
    AND column_name = 'vehicle_class_id'
  ) INTO v_vehicle_class_removed;

  RAISE NOTICE '5️⃣  VEHICLE CLASS REMOVAL';
  RAISE NOTICE '   Column removed: %', CASE WHEN v_vehicle_class_removed THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '   Status: %', CASE WHEN v_vehicle_class_removed THEN '✅ PASS' ELSE '❌ FAIL' END;
  RAISE NOTICE '';

  -- Final summary
  IF v_orders_policies >= 3
    AND v_order_items_policies >= 5
    AND v_order_items_rls_enabled
    AND v_product_name_nullable
    AND v_unit_nullable
    AND v_function_exists
    AND v_vehicle_class_removed
  THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL HOTFIXES VERIFIED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '❌ SOME HOTFIXES FAILED VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Please review the failures above and';
    RAISE NOTICE '   run the hotfix migration again:';
    RAISE NOTICE '   20251108100000_apply_all_pending_hotfixes.sql';
  END IF;

  RAISE NOTICE '';
END $$;

-- List all policies for orders and order_items
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename, cmd, policyname;
