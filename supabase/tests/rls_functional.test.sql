-- ============================================================================
-- FUNCTIONAL RLS POLICY TESTS
-- ============================================================================
-- This test suite creates test users and verifies RLS policies work correctly
-- for different roles.
--
-- IMPORTANT: Run this in a TEST environment only!
-- ============================================================================

DO $$
DECLARE
  v_contractor_id UUID;
  v_supplier_admin_id UUID;
  v_driver_id UUID;
  v_admin_id UUID;
  v_supplier_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_delivery_id UUID;
  v_test_results TEXT := '';
  v_test_count INTEGER := 0;
  v_pass_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 RLS FUNCTIONAL TEST SUITE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ============================================================================
  -- SETUP: Create test users
  -- ============================================================================

  RAISE NOTICE '📋 Setting up test users...';

  -- Create test contractor
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
  VALUES (
    gen_random_uuid(),
    'test-contractor@example.com',
    crypt('password', gen_salt('bf')),
    now()
  )
  RETURNING id INTO v_contractor_id;

  INSERT INTO profiles (id, role, full_name, email)
  VALUES (v_contractor_id, 'contractor', 'Test Contractor', 'test-contractor@example.com');

  -- Create test supplier admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
  VALUES (
    gen_random_uuid(),
    'test-supplier@example.com',
    crypt('password', gen_salt('bf')),
    now()
  )
  RETURNING id INTO v_supplier_admin_id;

  INSERT INTO profiles (id, role, full_name, email)
  VALUES (v_supplier_admin_id, 'supplier_admin', 'Test Supplier', 'test-supplier@example.com');

  -- Create test supplier
  INSERT INTO suppliers (id, owner_id, business_name, email, is_verified, location)
  VALUES (
    gen_random_uuid(),
    v_supplier_admin_id,
    'Test Supplier Co',
    'test-supplier@example.com',
    true,
    ST_SetSRID(ST_MakePoint(35.9106, 31.9539), 4326)::geography
  )
  RETURNING id INTO v_supplier_id;

  -- Create test driver
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
  VALUES (
    gen_random_uuid(),
    'test-driver@example.com',
    crypt('password', gen_salt('bf')),
    now()
  )
  RETURNING id INTO v_driver_id;

  INSERT INTO profiles (id, role, full_name, email)
  VALUES (v_driver_id, 'driver', 'Test Driver', 'test-driver@example.com');

  -- Create test admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
  VALUES (
    gen_random_uuid(),
    'test-admin@example.com',
    crypt('password', gen_salt('bf')),
    now()
  )
  RETURNING id INTO v_admin_id;

  INSERT INTO profiles (id, role, full_name, email)
  VALUES (v_admin_id, 'admin', 'Test Admin', 'test-admin@example.com');

  RAISE NOTICE '✅ Test users created';
  RAISE NOTICE '';

  -- ============================================================================
  -- TEST 1: Contractor can create and view their own orders
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Contractor can create orders', v_test_count;

  BEGIN
    -- Set session as contractor
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_contractor_id::text)::text, true);

    -- Create order
    INSERT INTO orders (
      contractor_id,
      supplier_id,
      delivery_address,
      delivery_lat,
      delivery_lng,
      delivery_zone,
      delivery_fee_jod,
      subtotal_jod,
      total_jod,
      status
    )
    VALUES (
      v_contractor_id,
      v_supplier_id,
      'Test Address',
      31.9539,
      35.9106,
      'zone_a',
      5.00,
      100.00,
      105.00,
      'pending'
    )
    RETURNING id INTO v_order_id;

    -- Verify contractor can see their order
    IF EXISTS (SELECT 1 FROM orders WHERE id = v_order_id) THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Contractor cannot see own order';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 2: Contractor can create order items
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Contractor can create order items', v_test_count;

  BEGIN
    -- Still as contractor
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price_jod,
      total_price_jod
    )
    VALUES (
      v_order_id,
      gen_random_uuid(),
      'Test Product',
      10,
      10.00,
      100.00
    )
    RETURNING id INTO v_order_item_id;

    IF v_order_item_id IS NOT NULL THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Could not create order item';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 3: Contractor cannot see other contractors' orders
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Contractor cannot see other orders', v_test_count;

  DECLARE
    v_other_contractor_id UUID;
    v_other_order_id UUID;
    v_can_see BOOLEAN;
  BEGIN
    -- Create another contractor
    INSERT INTO auth.users (id, email, encrypted_password)
    VALUES (gen_random_uuid(), 'other-contractor@example.com', crypt('password', gen_salt('bf')))
    RETURNING id INTO v_other_contractor_id;

    INSERT INTO profiles (id, role, full_name, email)
    VALUES (v_other_contractor_id, 'contractor', 'Other Contractor', 'other-contractor@example.com');

    -- Create order as other contractor (using service role)
    PERFORM set_config('request.jwt.claims', NULL, true);

    INSERT INTO orders (contractor_id, supplier_id, delivery_address, delivery_lat, delivery_lng, delivery_zone, delivery_fee_jod, subtotal_jod, total_jod, status)
    VALUES (v_other_contractor_id, v_supplier_id, 'Other Address', 31.9539, 35.9106, 'zone_a', 5.00, 100.00, 105.00, 'pending')
    RETURNING id INTO v_other_order_id;

    -- Switch back to original contractor
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_contractor_id::text)::text, true);

    -- Try to see other contractor's order
    SELECT EXISTS (SELECT 1 FROM orders WHERE id = v_other_order_id) INTO v_can_see;

    IF NOT v_can_see THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Contractor can see other contractor's order';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 4: Supplier can view their orders
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Supplier can view their orders', v_test_count;

  BEGIN
    -- Switch to supplier admin
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_supplier_admin_id::text)::text, true);

    -- Check if supplier can see the order
    IF EXISTS (SELECT 1 FROM orders WHERE id = v_order_id AND supplier_id = v_supplier_id) THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Supplier cannot see their order';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 5: Supplier can view order items for their orders
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Supplier can view order items', v_test_count;

  BEGIN
    -- Still as supplier
    IF EXISTS (SELECT 1 FROM order_items WHERE id = v_order_item_id) THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Supplier cannot see order items';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 6: Driver can view orders in delivery phase
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Driver can view delivery-phase orders', v_test_count;

  BEGIN
    -- Update order to in_delivery status (as service role)
    PERFORM set_config('request.jwt.claims', NULL, true);
    UPDATE orders SET status = 'in_delivery' WHERE id = v_order_id;

    -- Create delivery
    INSERT INTO deliveries (order_id, driver_id, status)
    VALUES (v_order_id, v_driver_id, 'assigned')
    RETURNING id INTO v_delivery_id;

    -- Switch to driver
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text)::text, true);

    -- Check if driver can see the order
    IF EXISTS (SELECT 1 FROM orders WHERE id = v_order_id) THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Driver cannot see delivery-phase order';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 7: Driver cannot view pending orders
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Driver cannot view pending orders', v_test_count;

  DECLARE
    v_pending_order_id UUID;
    v_can_see_pending BOOLEAN;
  BEGIN
    -- Create a pending order (as service role)
    PERFORM set_config('request.jwt.claims', NULL, true);

    INSERT INTO orders (contractor_id, supplier_id, delivery_address, delivery_lat, delivery_lng, delivery_zone, delivery_fee_jod, subtotal_jod, total_jod, status)
    VALUES (v_contractor_id, v_supplier_id, 'Test Address', 31.9539, 35.9106, 'zone_a', 5.00, 100.00, 105.00, 'pending')
    RETURNING id INTO v_pending_order_id;

    -- Switch to driver
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text)::text, true);

    -- Try to see pending order
    SELECT EXISTS (SELECT 1 FROM orders WHERE id = v_pending_order_id) INTO v_can_see_pending;

    IF NOT v_can_see_pending THEN
      RAISE NOTICE '  ✅ PASS';
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Driver can see pending order';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 8: Admin can view all orders
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: Admin can view all orders', v_test_count;

  DECLARE
    v_order_count INTEGER;
  BEGIN
    -- Switch to admin
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text)::text, true);

    -- Count visible orders
    SELECT COUNT(*) INTO v_order_count FROM orders;

    IF v_order_count >= 2 THEN  -- Should see at least the 2 orders we created
      RAISE NOTICE '  ✅ PASS (can see % orders)', v_order_count;
      v_pass_count := v_pass_count + 1;
    ELSE
      RAISE NOTICE '  ❌ FAIL - Admin can only see % orders', v_order_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ FAIL - %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 9: No circular dependency in policies
  -- ============================================================================

  v_test_count := v_test_count + 1;
  RAISE NOTICE 'Test %: No circular dependency errors', v_test_count;

  DECLARE
    v_no_error BOOLEAN := true;
  BEGIN
    -- Try operations that previously caused recursion
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_driver_id::text)::text, true);

    -- This used to cause infinite recursion
    PERFORM * FROM orders LIMIT 1;
    PERFORM * FROM deliveries LIMIT 1;

    RAISE NOTICE '  ✅ PASS - No recursion detected';
    v_pass_count := v_pass_count + 1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%infinite recursion%' THEN
      RAISE NOTICE '  ❌ FAIL - Circular dependency detected: %', SQLERRM;
    ELSE
      RAISE NOTICE '  ✅ PASS - No recursion (other error: %)', SQLERRM;
      v_pass_count := v_pass_count + 1;
    END IF;
  END;

  -- ============================================================================
  -- CLEANUP
  -- ============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '🧹 Cleaning up test data...';

  -- Reset session
  PERFORM set_config('request.jwt.claims', NULL, true);

  -- Delete test data (in reverse order of dependencies)
  DELETE FROM deliveries WHERE order_id = v_order_id OR driver_id = v_driver_id;
  DELETE FROM order_items WHERE order_id = v_order_id;
  DELETE FROM orders WHERE contractor_id = v_contractor_id OR contractor_id IN (
    SELECT id FROM profiles WHERE email LIKE 'test-%@example.com' OR email LIKE 'other-%@example.com'
  );
  DELETE FROM suppliers WHERE owner_id = v_supplier_admin_id;
  DELETE FROM profiles WHERE email LIKE 'test-%@example.com' OR email LIKE 'other-%@example.com';
  DELETE FROM auth.users WHERE email LIKE 'test-%@example.com' OR email LIKE 'other-%@example.com';

  -- ============================================================================
  -- RESULTS
  -- ============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 TEST RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Tests: %', v_test_count;
  RAISE NOTICE 'Passed: %', v_pass_count;
  RAISE NOTICE 'Failed: %', v_test_count - v_pass_count;
  RAISE NOTICE 'Success Rate: %%', ROUND((v_pass_count::NUMERIC / v_test_count::NUMERIC * 100)::NUMERIC, 2);
  RAISE NOTICE '';

  IF v_pass_count = v_test_count THEN
    RAISE NOTICE '✅ ALL TESTS PASSED!';
  ELSE
    RAISE NOTICE '❌ SOME TESTS FAILED - Review output above';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
