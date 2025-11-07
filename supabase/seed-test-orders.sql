-- ==========================================
-- TEST ORDERS FOR CONTRACTORS MALL
-- ==========================================
-- This file creates comprehensive test data for orders
-- Run after seed-dev.sql with: psql $DATABASE_URL -f seed-test-orders.sql

-- ==========================================
-- TEST CONTRACTORS
-- ==========================================
DO $$
DECLARE
  contractor1_id UUID := 'b1111111-0000-0000-0000-000000000001';
  contractor2_id UUID := 'b2222222-0000-0000-0000-000000000002';
  contractor3_id UUID := 'b3333333-0000-0000-0000-000000000003';
  supplier1_id UUID := 'd1111111-1111-1111-1111-111111111111';
  supplier2_id UUID := 'd2222222-2222-2222-2222-222222222222';
  supplier3_id UUID := 'd3333333-3333-3333-3333-333333333333';
  order1_id UUID;
  order2_id UUID;
  order3_id UUID;
  order4_id UUID;
  order5_id UUID;
  order6_id UUID;
BEGIN
  -- Create contractor auth users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES
    (
      contractor1_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'contractor1@test.jo',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"سامر المقاول"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ),
    (
      contractor2_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'contractor2@test.jo',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"عمر البناء"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ),
    (
      contractor3_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'contractor3@test.jo',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"ياسر الإنشاءات"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create contractor profiles
  INSERT INTO profiles (id, role, phone, full_name, email, preferred_language) VALUES
    (contractor1_id, 'contractor', '+962795551111', 'سامر المقاول', 'contractor1@test.jo', 'ar'),
    (contractor2_id, 'contractor', '+962795552222', 'عمر البناء', 'contractor2@test.jo', 'ar'),
    (contractor3_id, 'contractor', '+962795553333', 'ياسر الإنشاءات', 'contractor3@test.jo', 'en')
  ON CONFLICT (id) DO NOTHING;

  -- Create projects for contractors
  INSERT INTO projects (id, contractor_id, name, address, start_date, end_date, budget_jod, notes) VALUES
    ('p1111111-0000-0000-0000-000000000001', contractor1_id, 'فيلا السالمية', 'عمان - دابوق', '2024-01-01', '2024-12-31', 50000, 'مشروع فيلا سكنية'),
    ('p2222222-0000-0000-0000-000000000002', contractor1_id, 'عمارة الأردن', 'عمان - الصويفية', '2024-03-01', '2025-03-01', 150000, 'عمارة سكنية 4 طوابق'),
    ('p3333333-0000-0000-0000-000000000003', contractor2_id, 'مجمع تجاري', 'الزرقاء', '2024-02-01', '2024-10-01', 80000, 'مجمع تجاري صغير')
  ON CONFLICT (id) DO NOTHING;

  -- ==========================================
  -- CREATE TEST ORDERS
  -- ==========================================

  -- Order 1: Pending order (just created)
  order1_id := uuid_generate_v4();
  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id, project_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    vehicle_type, vehicle_class_id, delivery_zone,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_neighborhood, delivery_city,
    scheduled_delivery_date, scheduled_delivery_time,
    notes, created_at
  ) VALUES (
    order1_id, 'ORD-2025-001', contractor1_id, supplier1_id, 'p1111111-0000-0000-0000-000000000001',
    'pending', 450.00, 10.00, 460.00,
    'pickup_1t', '11111111-1111-1111-1111-111111111111', 'zone_a',
    'شارع الجامعة الأردنية، عمان',
    31.9539, 35.9106,
    'الجبيهة', 'عمان',
    CURRENT_DATE + INTERVAL '1 day', '09:00-12:00',
    'يرجى الاتصال قبل الوصول', NOW() - INTERVAL '2 hours'
  );

  -- Order 1 items
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, unit, unit_price_jod, total_jod, weight_kg, volume_m3) VALUES
    (order1_id, 'prod1111-0000-0000-0000-000000000001', 50, 4.50, 225.00, 'أسمنت بورتلاندي 50 كجم', 'كيس', 4.50, 225.00, 2500, 1.75),
    (order1_id, 'prod2222-0000-0000-0000-000000000001', 100, 2.25, 225.00, 'طوب أحمر', 'قطعة', 2.25, 225.00, 300, 0.5);

  -- Order 2: Confirmed order (accepted by supplier)
  order2_id := uuid_generate_v4();
  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    vehicle_type, vehicle_class_id, delivery_zone,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_neighborhood, delivery_city,
    scheduled_delivery_date, scheduled_delivery_time,
    created_at, updated_at
  ) VALUES (
    order2_id, 'ORD-2025-002', contractor2_id, supplier1_id,
    'confirmed', 1250.00, 15.00, 1265.00,
    'truck_3.5t', '22222222-2222-2222-2222-222222222222', 'zone_b',
    'المنطقة الصناعية، الزرقاء',
    32.0709, 36.0880,
    'المنطقة الصناعية', 'الزرقاء',
    CURRENT_DATE + INTERVAL '2 days', '14:00-17:00',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours'
  );

  -- Order 2 items
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, unit, unit_price_jod, total_jod, weight_kg, volume_m3) VALUES
    (order2_id, 'prod3333-0000-0000-0000-000000000001', 2, 625.00, 1250.00, 'حديد تسليح 12 ملم', 'طن', 625.00, 1250.00, 2000, 0.178);

  -- Order 3: On the way order
  order3_id := uuid_generate_v4();
  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    vehicle_type, vehicle_class_id, delivery_zone,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_neighborhood, delivery_city,
    scheduled_delivery_date, scheduled_delivery_time,
    created_at, updated_at
  ) VALUES (
    order3_id, 'ORD-2025-003', contractor1_id, supplier2_id,
    'on_the_way', 90.00, 8.00, 98.00,
    'pickup_1t', '11111111-1111-1111-1111-111111111111', 'zone_a',
    'عبدون، عمان',
    31.9539, 35.8814,
    'عبدون', 'عمان',
    CURRENT_DATE, '10:00-13:00',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'
  );

  -- Order 3 items (below PIN threshold)
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, unit, unit_price_jod, total_jod, weight_kg, volume_m3) VALUES
    (order3_id, 'prod4444-0000-0000-0000-000000000001', 5, 18.00, 90.00, 'رمل ناعم', 'متر مكعب', 18.00, 90.00, 8000, 5.0);

  -- Order 4: Delivered order (pending confirmation)
  order4_id := uuid_generate_v4();
  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id, project_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    vehicle_type, vehicle_class_id, delivery_zone,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_neighborhood, delivery_city,
    scheduled_delivery_date, scheduled_delivery_time,
    delivery_notes,
    created_at, updated_at
  ) VALUES (
    order4_id, 'ORD-2025-004', contractor3_id, supplier2_id, 'p3333333-0000-0000-0000-000000000003',
    'delivered', 145.00, 10.00, 155.00,
    'pickup_1t', '11111111-1111-1111-1111-111111111111', 'zone_a',
    'شارع المطار، ماركا',
    31.9722, 35.9917,
    'ماركا', 'عمان',
    CURRENT_DATE - INTERVAL '1 day', '09:00-12:00',
    'تم التسليم في الموعد المحدد',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'
  );

  -- Order 4 items (above PIN threshold)
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, unit, unit_price_jod, total_jod, weight_kg, volume_m3) VALUES
    (order4_id, 'prod5555-0000-0000-0000-000000000001', 29, 5.00, 145.00, 'بلوك إسمنتي 20سم', 'قطعة', 5.00, 145.00, 580, 0.29);

  -- Create delivery record for delivered order
  INSERT INTO deliveries (
    id, order_id, driver_id, status,
    actual_delivery_date, actual_delivery_time,
    confirmation_method, confirmation_pin,
    notes, created_at, updated_at
  ) VALUES (
    uuid_generate_v4(), order4_id, null, 'pending_confirmation',
    CURRENT_DATE - INTERVAL '1 day', '11:30',
    'pin', '123456',
    'في انتظار تأكيد الاستلام من المقاول', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  );

  -- Order 5: Completed order (with payment released)
  order5_id := uuid_generate_v4();
  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    vehicle_type, vehicle_class_id, delivery_zone,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_neighborhood, delivery_city,
    scheduled_delivery_date, scheduled_delivery_time,
    created_at, updated_at
  ) VALUES (
    order5_id, 'ORD-2024-998', contractor2_id, supplier3_id,
    'completed', 2500.00, 22.00, 2522.00,
    'flatbed_5t', '33333333-3333-3333-3333-333333333333', 'zone_b',
    'العقبة - المنطقة الصناعية',
    29.5321, 35.0063,
    'المنطقة الصناعية', 'العقبة',
    CURRENT_DATE - INTERVAL '10 days', '08:00-11:00',
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'
  );

  -- Order 5 items
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, unit, unit_price_jod, total_jod, weight_kg, volume_m3) VALUES
    (order5_id, 'prod3333-0000-0000-0000-000000000001', 4, 625.00, 2500.00, 'حديد تسليح 16 ملم', 'طن', 625.00, 2500.00, 4000, 0.356);

  -- Create completed delivery for order 5
  INSERT INTO deliveries (
    id, order_id, driver_id, status,
    actual_delivery_date, actual_delivery_time,
    confirmation_method, confirmation_pin, delivery_proof_url,
    notes, created_at, updated_at
  ) VALUES (
    uuid_generate_v4(), order5_id, null, 'confirmed',
    CURRENT_DATE - INTERVAL '10 days', '09:45',
    'pin', '789012', null,
    'تم التسليم والتأكيد بنجاح', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
  );

  -- Create payment record for completed order
  INSERT INTO payments (
    id, order_id, amount_jod, status,
    payment_method, transaction_id,
    paid_at, released_at,
    created_at, updated_at
  ) VALUES (
    uuid_generate_v4(), order5_id, 2522.00, 'released',
    'card', 'TXN-2024-998-001',
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days'
  );

  -- Order 6: Disputed order
  order6_id := uuid_generate_v4();
  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    vehicle_type, vehicle_class_id, delivery_zone,
    delivery_address, delivery_latitude, delivery_longitude,
    delivery_neighborhood, delivery_city,
    scheduled_delivery_date, scheduled_delivery_time,
    disputed_at, dispute_reason,
    created_at, updated_at
  ) VALUES (
    order6_id, 'ORD-2024-999', contractor1_id, supplier3_id,
    'disputed', 380.00, 15.00, 395.00,
    'truck_3.5t', '22222222-2222-2222-2222-222222222222', 'zone_a',
    'الدوار السابع، عمان',
    31.9539, 35.8814,
    'الدوار السابع', 'عمان',
    CURRENT_DATE - INTERVAL '5 days', '14:00-17:00',
    NOW() - INTERVAL '3 days', 'كمية خاطئة - تم توصيل 30 كيس بدلاً من 50',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days'
  );

  -- Order 6 items
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, unit, unit_price_jod, total_jod, weight_kg, volume_m3) VALUES
    (order6_id, 'prod1111-0000-0000-0000-000000000001', 50, 4.50, 225.00, 'أسمنت بورتلاندي 50 كجم', 'كيس', 4.50, 225.00, 2500, 1.75),
    (order6_id, 'prod5555-0000-0000-0000-000000000001', 31, 5.00, 155.00, 'بلوك إسمنتي 15سم', 'قطعة', 5.00, 155.00, 620, 0.31);

  -- Create dispute record
  INSERT INTO disputes (
    id, order_id, raised_by, reason, description,
    status, priority,
    created_at, updated_at
  ) VALUES (
    uuid_generate_v4(), order6_id, contractor1_id, 'quantity_issue',
    'تم توصيل 30 كيس أسمنت فقط بدلاً من 50 كيس كما هو مطلوب في الطلب',
    'under_review', 'high',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  );

  -- Create payment on hold for disputed order
  INSERT INTO payments (
    id, order_id, amount_jod, status,
    payment_method, transaction_id,
    paid_at,
    created_at, updated_at
  ) VALUES (
    uuid_generate_v4(), order6_id, 395.00, 'held',
    'card', 'TXN-2024-999-001',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days'
  );

END $$;

-- ==========================================
-- CREATE TEST PRODUCTS FOR EXISTING SUPPLIERS
-- ==========================================
-- Adding products to existing suppliers from seed-dev.sql

-- Products for Supplier 1 (Al-Mawad)
INSERT INTO products (
  id, supplier_id, category_id, sku, name_ar, name_en,
  description_ar, description_en, unit_ar, unit_en,
  price_per_unit, weight_kg_per_unit, volume_m3_per_unit,
  min_order_quantity, is_available, stock_quantity
) VALUES
  ('prod1111-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'CEM-PRT-50', 'أسمنت بورتلاندي 50 كجم', 'Portland Cement 50kg', 'أسمنت بورتلاندي عالي الجودة', 'High quality Portland cement', 'كيس', 'bag', 4.50, 50, 0.035, 10, true, 500),
  ('prod2222-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888', 'BRK-RED-20', 'طوب أحمر', 'Red Brick', 'طوب أحمر عالي الجودة', 'High quality red brick', 'قطعة', 'piece', 2.25, 3, 0.005, 100, true, 5000),
  ('prod3333-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'STL-RBR-12', 'حديد تسليح 12 ملم', 'Rebar 12mm', 'حديد تسليح قطر 12 ملم', 'Reinforcement steel 12mm diameter', 'طن', 'ton', 625.00, 1000, 0.089, 1, true, 20)
ON CONFLICT (id) DO NOTHING;

-- Products for Supplier 2 (Al-Bina)
INSERT INTO products (
  id, supplier_id, category_id, sku, name_ar, name_en,
  description_ar, description_en, unit_ar, unit_en,
  price_per_unit, weight_kg_per_unit, volume_m3_per_unit,
  min_order_quantity, is_available, stock_quantity
) VALUES
  ('prod4444-0000-0000-0000-000000000001', 'd2222222-2222-2222-2222-222222222222', 'c7777777-7777-7777-7777-777777777777', 'SND-FIN-M3', 'رمل ناعم', 'Fine Sand', 'رمل ناعم منخول', 'Fine sieved sand', 'متر مكعب', 'm³', 18.00, 1600, 1.0, 3, true, 100),
  ('prod5555-0000-0000-0000-000000000001', 'd2222222-2222-2222-2222-222222222222', 'c8888888-8888-8888-8888-888888888888', 'BLK-20CM', 'بلوك إسمنتي 20سم', 'Concrete Block 20cm', 'بلوك إسمنتي مقاس 20سم', 'Concrete block 20cm size', 'قطعة', 'piece', 5.00, 20, 0.01, 50, true, 2000)
ON CONFLICT (id) DO NOTHING;

-- Products for Supplier 3 (Khaled Trading) - if it exists
INSERT INTO products (
  id, supplier_id, category_id, sku, name_ar, name_en,
  description_ar, description_en, unit_ar, unit_en,
  price_per_unit, weight_kg_per_unit, volume_m3_per_unit,
  min_order_quantity, is_available, stock_quantity
) VALUES
  ('prod6666-0000-0000-0000-000000000001', 'd3333333-3333-3333-3333-333333333333', 'ca111111-1111-1111-1111-111111111111', 'CBL-2.5MM', 'كابل كهربائي 2.5 ملم', 'Electric Cable 2.5mm', 'كابل كهربائي نحاس', 'Copper electric cable', 'متر', 'meter', 1.50, 0.05, 0.0001, 100, true, 5000),
  ('prod7777-0000-0000-0000-000000000001', 'd3333333-3333-3333-3333-333333333333', 'cf111111-1111-1111-1111-111111111111', 'PNT-WHT-18L', 'دهان أبيض 18 لتر', 'White Paint 18L', 'دهان أبيض داخلي', 'Interior white paint', 'جالون', 'gallon', 45.00, 20, 0.018, 1, true, 50)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SUMMARY
-- ==========================================
-- Created:
-- - 3 test contractors with profiles
-- - 3 projects linked to contractors
-- - 6 comprehensive test orders with different statuses:
--   * Order 1: Pending (new order waiting for supplier acceptance)
--   * Order 2: Confirmed (accepted by supplier, preparing)
--   * Order 3: On the way (below PIN threshold - photo proof needed)
--   * Order 4: Delivered (above PIN threshold - PIN needed)
--   * Order 5: Completed (fully delivered and paid)
--   * Order 6: Disputed (payment on hold)
-- - Order items for each order
-- - Delivery records for delivered/completed orders
-- - Payment records with appropriate statuses
-- - A dispute record for the disputed order
-- - Products for all suppliers to support order items

-- Test credentials:
-- Contractors: contractor1@test.jo, contractor2@test.jo, contractor3@test.jo
-- Password for all: TestPassword123!