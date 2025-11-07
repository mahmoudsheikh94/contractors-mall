-- ==========================================
-- DEVELOPMENT SEED DATA FOR CONTRACTORS MALL
-- ==========================================
-- This file contains test data for development
-- Run with: supabase db seed

-- Clear existing test data
TRUNCATE TABLE
  media,
  reviews,
  disputes,
  payment_events,
  payments,
  deliveries,
  order_items,
  orders,
  projects,
  products,
  categories,
  supplier_zone_fees,
  suppliers,
  vehicles,
  settings
CASCADE;

-- ==========================================
-- VEHICLES (Default vehicle classes)
-- ==========================================
INSERT INTO vehicles (id, name_ar, name_en, class_code, max_weight_kg, max_volume_m3, max_length_m, has_open_bed, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'وانيت 1 طن', 'Pickup 1 Ton', 'pickup_1t', 1000, 3.5, 3, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'شاحنة 3.5 طن', 'Truck 3.5 Ton', 'truck_3.5t', 3500, 12, 4.5, false, 2),
  ('33333333-3333-3333-3333-333333333333', 'قلاب مسطح 5 طن', 'Flatbed 5 Ton', 'flatbed_5t', 5000, 18, 6, true, 3);

-- ==========================================
-- SETTINGS (Platform configuration)
-- ==========================================
INSERT INTO settings (key, value, description) VALUES
  ('delivery_settings', jsonb_build_object(
    'photo_threshold_jod', 120,
    'pin_threshold_jod', 120,
    'safety_margin_percent', 10
  ), 'Delivery approval thresholds and safety margin'),

  ('commission_settings', jsonb_build_object(
    'commission_percent', 10,
    'free_period_days', 30
  ), 'Platform commission and free period settings'),

  ('dispute_settings', jsonb_build_object(
    'site_visit_threshold_jod', 350,
    'auto_resolve_days', 7
  ), 'Dispute resolution thresholds'),

  ('platform_settings', jsonb_build_object(
    'maintenance_mode', false,
    'allow_new_registrations', true,
    'default_language', 'ar',
    'supported_languages', ARRAY['ar', 'en']
  ), 'General platform settings');

-- ==========================================
-- CATEGORIES (Product categories)
-- ==========================================
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon_name, display_order) VALUES
  -- Main Categories
  ('c1111111-1111-1111-1111-111111111111', NULL, 'مواد بناء عامة', 'General Construction', 'general-construction', 'hammer', 1),
  ('c2222222-2222-2222-2222-222222222222', NULL, 'كهربائيات وإنارة', 'Electrical & Lighting', 'electrical-lighting', 'zap', 2),
  ('c3333333-3333-3333-3333-333333333333', NULL, 'أدوات صحية', 'Plumbing', 'plumbing', 'droplet', 3),
  ('c4444444-4444-4444-4444-444444444444', NULL, 'دهانات ومواد تشطيب', 'Paints & Finishing', 'paints-finishing', 'paint-bucket', 4),

  -- Sub-categories for General Construction
  ('c5555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'أسمنت', 'Cement', 'cement', NULL, 1),
  ('c6666666-6666-6666-6666-666666666666', 'c1111111-1111-1111-1111-111111111111', 'حديد', 'Steel', 'steel', NULL, 2),
  ('c7777777-7777-7777-7777-777777777777', 'c1111111-1111-1111-1111-111111111111', 'رمل وحصى', 'Sand & Gravel', 'sand-gravel', NULL, 3),
  ('c8888888-8888-8888-8888-888888888888', 'c1111111-1111-1111-1111-111111111111', 'طوب وبلوك', 'Bricks & Blocks', 'bricks-blocks', NULL, 4),
  ('c9999999-9999-9999-9999-999999999999', 'c1111111-1111-1111-1111-111111111111', 'خشب', 'Wood', 'wood', NULL, 5),

  -- Sub-categories for Electrical
  ('ca111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'أسلاك وكابلات', 'Wires & Cables', 'wires-cables', NULL, 1),
  ('cb111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'مفاتيح وقواطع', 'Switches & Breakers', 'switches-breakers', NULL, 2),
  ('cc111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'إنارة', 'Lighting', 'lighting', NULL, 3),

  -- Sub-categories for Plumbing
  ('cd111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'أنابيب', 'Pipes', 'pipes', NULL, 1),
  ('ce111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'صنابير ومحابس', 'Faucets & Valves', 'faucets-valves', NULL, 2),

  -- Sub-categories for Paints
  ('cf111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444', 'دهانات داخلية', 'Interior Paints', 'interior-paints', NULL, 1),
  ('c0111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444', 'دهانات خارجية', 'Exterior Paints', 'exterior-paints', NULL, 2);

-- ==========================================
-- TEST SUPPLIER PROFILES
-- ==========================================
-- Note: These IDs would normally come from Supabase Auth
-- For testing, we'll create placeholder auth users and profiles
DO $$
DECLARE
  supplier1_id UUID := 'a1111111-0000-0000-0000-000000000001';
  supplier2_id UUID := 'a2222222-0000-0000-0000-000000000002';
  supplier3_id UUID := 'a3333333-0000-0000-0000-000000000003';
BEGIN
  -- Create auth users first (required for profiles foreign key)
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
      supplier1_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ahmad@almawad.jo',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"أحمد الموّاد"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ),
    (
      supplier2_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad@bina.jo',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"محمد البناء"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ),
    (
      supplier3_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'khaled@tijara.jo',
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"خالد للتجارة"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create test supplier admin profiles
  INSERT INTO profiles (id, role, phone, full_name, email, preferred_language) VALUES
    (supplier1_id, 'supplier_admin', '+962791234567', 'أحمد الموّاد', 'ahmad@almawad.jo', 'ar'),
    (supplier2_id, 'supplier_admin', '+962792345678', 'محمد البناء', 'mohammad@bina.jo', 'ar'),
    (supplier3_id, 'supplier_admin', '+962793456789', 'خالد للتجارة', 'khaled@tijara.jo', 'ar')
  ON CONFLICT (id) DO NOTHING;

  -- Create suppliers
  INSERT INTO suppliers (
    id, owner_id, business_name, business_name_en, phone, email,
    address, latitude, longitude, radius_km_zone_a, radius_km_zone_b,
    is_verified, rating_average, rating_count
  ) VALUES
    -- Supplier 1: Al-Mawad (Amman-based)
    (
      'd1111111-1111-1111-1111-111111111111',
      supplier1_id,
      'شركة الموّاد الأردنية',
      'Jordan Materials Company',
      '+962791234567',
      'info@almawad.jo',
      'شارع المدينة الصناعية، سحاب، عمان',
      31.8733, 36.0044,
      15, 30,
      true, 4.5, 23
    ),
    -- Supplier 2: Al-Bina (Amman-based)
    (
      'd2222222-2222-2222-2222-222222222222',
      supplier2_id,
      'مؤسسة البناء الحديث',
      'Modern Construction Est.',
      '+962792345678',
      'info@bina.jo',
      'شارع الملك عبدالله، ماركا، عمان',
      31.9764, 35.9947,
      10, 25,
      true, 4.2, 15
    ),
    -- Supplier 3: Al-Tijara (Aqaba-based)
    (
      'd3333333-3333-3333-3333-333333333333',
      supplier3_id,
      'شركة التجارة للمواد الإنشائية',
      'Trade Construction Materials Co.',
      '+962793456789',
      'info@tijara.jo',
      'المنطقة الصناعية، العقبة',
      29.5321, 35.0063,
      8, 20,
      true, 4.7, 8
    );

  -- Supplier zone fees for all suppliers
  -- Supplier 1 fees
  INSERT INTO supplier_zone_fees (supplier_id, zone, vehicle_class_id, base_fee_jod) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'zone_a', '11111111-1111-1111-1111-111111111111', 5.00),
    ('d1111111-1111-1111-1111-111111111111', 'zone_a', '22222222-2222-2222-2222-222222222222', 10.00),
    ('d1111111-1111-1111-1111-111111111111', 'zone_a', '33333333-3333-3333-3333-333333333333', 15.00),
    ('d1111111-1111-1111-1111-111111111111', 'zone_b', '11111111-1111-1111-1111-111111111111', 8.00),
    ('d1111111-1111-1111-1111-111111111111', 'zone_b', '22222222-2222-2222-2222-222222222222', 15.00),
    ('d1111111-1111-1111-1111-111111111111', 'zone_b', '33333333-3333-3333-3333-333333333333', 22.00),

  -- Supplier 2 fees (slightly cheaper)
    ('d2222222-2222-2222-2222-222222222222', 'zone_a', '11111111-1111-1111-1111-111111111111', 4.00),
    ('d2222222-2222-2222-2222-222222222222', 'zone_a', '22222222-2222-2222-2222-222222222222', 9.00),
    ('d2222222-2222-2222-2222-222222222222', 'zone_a', '33333333-3333-3333-3333-333333333333', 14.00),
    ('d2222222-2222-2222-2222-222222222222', 'zone_b', '11111111-1111-1111-1111-111111111111', 7.00),
    ('d2222222-2222-2222-2222-222222222222', 'zone_b', '22222222-2222-2222-2222-222222222222', 14.00),
    ('d2222222-2222-2222-2222-222222222222', 'zone_b', '33333333-3333-3333-3333-333333333333', 20.00),

  -- Supplier 3 fees (Aqaba pricing)
    ('d3333333-3333-3333-3333-333333333333', 'zone_a', '11111111-1111-1111-1111-111111111111', 3.00),
    ('d3333333-3333-3333-3333-333333333333', 'zone_a', '22222222-2222-2222-2222-222222222222', 7.00),
    ('d3333333-3333-3333-3333-333333333333', 'zone_a', '33333333-3333-3333-3333-333333333333', 12.00),
    ('d3333333-3333-3333-3333-333333333333', 'zone_b', '11111111-1111-1111-1111-111111111111', 6.00),
    ('d3333333-3333-3333-3333-333333333333', 'zone_b', '22222222-2222-2222-2222-222222222222', 12.00),
    ('d3333333-3333-3333-3333-333333333333', 'zone_b', '33333333-3333-3333-3333-333333333333', 18.00);

  -- Products for Supplier 1 (Al-Mawad)
  INSERT INTO products (
    supplier_id, category_id, sku, name_ar, name_en,
    description_ar, description_en, unit_ar, unit_en,
    price_per_unit, weight_kg_per_unit, volume_m3_per_unit, length_m_per_unit,
    min_order_quantity, is_available, stock_quantity
  ) VALUES
    -- Cement products
    ('d1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'CEM-PRT-50', 'أسمنت بورتلاندي 50 كجم', 'Portland Cement 50kg',
     'أسمنت بورتلاندي عالي الجودة للأعمال الإنشائية', 'High quality Portland cement for construction', 'كيس', 'bag',
     4.50, 50, 0.035, NULL, 10, true, 500),
    ('d1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'CEM-WHT-25', 'أسمنت أبيض 25 كجم', 'White Cement 25kg',
     'أسمنت أبيض للأعمال الديكورية', 'White cement for decorative works', 'كيس', 'bag',
     8.00, 25, 0.018, NULL, 5, true, 200),

    -- Steel products
    ('d1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'STL-RBR-8', 'حديد تسليح 8 ملم', 'Rebar 8mm',
     'حديد تسليح قطر 8 ملم طول 12 متر', 'Reinforcement steel 8mm diameter, 12m length', 'قضيب', 'bar',
     12.00, 47, 0.006, 12, 10, true, 1000),
    ('d1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'STL-RBR-12', 'حديد تسليح 12 ملم', 'Rebar 12mm',
     'حديد تسليح قطر 12 ملم طول 12 متر', 'Reinforcement steel 12mm diameter, 12m length', 'قضيب', 'bar',
     27.00, 106, 0.014, 12, 10, true, 800),
    ('d1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666', 'STL-RBR-16', 'حديد تسليح 16 ملم', 'Rebar 16mm',
     'حديد تسليح قطر 16 ملم طول 12 متر', 'Reinforcement steel 16mm diameter, 12m length', 'قضيب', 'bar',
     48.00, 189, 0.024, 12, 5, true, 400),

    -- Sand & Gravel
    ('d1111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777', 'SND-FIN-M3', 'رمل ناعم', 'Fine Sand',
     'رمل ناعم منخول للأعمال الإنشائية', 'Fine sieved sand for construction', 'متر مكعب', 'm³',
     18.00, 1600, 1.0, NULL, 3, true, 999),
    ('d1111111-1111-1111-1111-111111111111', 'c7777777-7777-7777-7777-777777777777', 'GRV-20MM-M3', 'حصى 20 ملم', 'Gravel 20mm',
     'حصى حجم 20 ملم للخرسانة', 'Gravel size 20mm for concrete', 'متر مكعب', 'm³',
     22.00, 1700, 1.0, NULL, 5, true, 999),

    -- Bricks & Blocks
    ('d1111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888', 'BLK-15-400', 'بلوك 15 سم', 'Block 15cm',
     'بلوك خرساني مفرغ 15×20×40 سم', 'Hollow concrete block 15×20×40cm', 'حبة', 'piece',
     0.35, 12, 0.012, 0.4, 100, true, 10000),
    ('d1111111-1111-1111-1111-111111111111', 'c8888888-8888-8888-8888-888888888888', 'BLK-20-400', 'بلوك 20 سم', 'Block 20cm',
     'بلوك خرساني مفرغ 20×20×40 سم', 'Hollow concrete block 20×20×40cm', 'حبة', 'piece',
     0.45, 16, 0.016, 0.4, 100, true, 8000);

  -- Products for Supplier 2 (Al-Bina)
  INSERT INTO products (
    supplier_id, category_id, sku, name_ar, name_en,
    description_ar, description_en, unit_ar, unit_en,
    price_per_unit, weight_kg_per_unit, volume_m3_per_unit,
    min_order_quantity, is_available
  ) VALUES
    -- Wood products
    ('d2222222-2222-2222-2222-222222222222', 'c9999999-9999-9999-9999-999999999999', 'WOD-PLY-18', 'خشب رقائقي 18 ملم', 'Plywood 18mm',
     'خشب رقائقي مقاوم للماء 122×244 سم', 'Waterproof plywood 122×244cm', 'لوح', 'sheet',
     28.00, 25, 0.054, 10, true),
    ('d2222222-2222-2222-2222-222222222222', 'c9999999-9999-9999-9999-999999999999', 'WOD-MDF-16', 'خشب MDF 16 ملم', 'MDF 16mm',
     'خشب MDF عالي الكثافة 122×244 سم', 'High density MDF 122×244cm', 'لوح', 'sheet',
     22.00, 20, 0.048, 10, true),

    -- Electrical products
    ('d2222222-2222-2222-2222-222222222222', 'ca111111-1111-1111-1111-111111111111', 'CBL-2.5-BLU', 'سلك كهرباء 2.5 ملم أزرق', 'Electric Cable 2.5mm Blue',
     'سلك كهربائي نحاسي معزول 2.5 ملم²', 'Insulated copper electric cable 2.5mm²', 'متر', 'meter',
     0.80, 0.023, 0.00001, 100, true),
    ('d2222222-2222-2222-2222-222222222222', 'cb111111-1111-1111-1111-111111111111', 'BRK-MCB-20A', 'قاطع كهربائي 20 أمبير', 'Circuit Breaker 20A',
     'قاطع كهربائي أحادي القطب 20 أمبير', 'Single pole circuit breaker 20A', 'حبة', 'piece',
     8.50, 0.150, 0.0002, 1, true),

    -- Plumbing products
    ('d2222222-2222-2222-2222-222222222222', 'cd111111-1111-1111-1111-111111111111', 'PIP-PVC-2IN', 'أنبوب PVC 2 بوصة', 'PVC Pipe 2 inch',
     'أنبوب PVC للصرف الصحي 2 بوصة طول 4 متر', 'PVC pipe for drainage 2 inch, 4m length', 'قطعة', 'piece',
     6.00, 3, 0.016, 10, true);

  -- Products for Supplier 3 (Al-Tijara)
  INSERT INTO products (
    supplier_id, category_id, sku, name_ar, name_en,
    description_ar, description_en, unit_ar, unit_en,
    price_per_unit, weight_kg_per_unit, volume_m3_per_unit,
    min_order_quantity, is_available
  ) VALUES
    -- Paints
    ('d3333333-3333-3333-3333-333333333333', 'cf111111-1111-1111-1111-111111111111', 'PNT-INT-WHT', 'دهان داخلي أبيض', 'Interior Paint White',
     'دهان داخلي أبيض مطفي 18 لتر', 'Interior matte white paint 18L', 'غالون', 'gallon',
     35.00, 20, 0.018, 1, true),
    ('d3333333-3333-3333-3333-333333333333', 'cg111111-1111-1111-1111-111111111111', 'PNT-EXT-GRY', 'دهان خارجي رمادي', 'Exterior Paint Grey',
     'دهان خارجي رمادي مقاوم للعوامل 18 لتر', 'Exterior weather-resistant grey paint 18L', 'غالون', 'gallon',
     45.00, 20, 0.018, 1, true),

    -- More cement varieties
    ('d3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555', 'CEM-RST-50', 'أسمنت مقاوم 50 كجم', 'Resistant Cement 50kg',
     'أسمنت مقاوم للأملاح والرطوبة', 'Salt and moisture resistant cement', 'كيس', 'bag',
     5.50, 50, 0.035, 10, true),

    -- Lighting
    ('d3333333-3333-3333-3333-333333333333', 'cc111111-1111-1111-1111-111111111111', 'LED-PNL-60', 'لوح LED 60×60', 'LED Panel 60×60',
     'لوح إضاءة LED للأسقف المستعارة 40 واط', 'LED ceiling panel 40W for false ceilings', 'حبة', 'piece',
     18.00, 2, 0.036, 1, true);

END $$;

-- ==========================================
-- DISPLAY SEED SUMMARY
-- ==========================================
DO $$
DECLARE
  v_supplier_count INTEGER;
  v_product_count INTEGER;
  v_category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_supplier_count FROM suppliers;
  SELECT COUNT(*) INTO v_product_count FROM products;
  SELECT COUNT(*) INTO v_category_count FROM categories;

  RAISE NOTICE '
  ════════════════════════════════════════════════════════════════
  ✅ DEVELOPMENT SEED DATA LOADED SUCCESSFULLY
  ════════════════════════════════════════════════════════════════
  Created:
  - % Vehicles (وانيت، شاحنة، قلاب)
  - % Settings (delivery, commission, dispute, platform)
  - % Categories (with subcategories)
  - % Suppliers (verified, with zones and fees)
  - % Products (various construction materials)

  Test Suppliers:
  1. شركة الموّاد الأردنية (Amman) - General materials
  2. مؤسسة البناء الحديث (Amman) - Wood, Electrical, Plumbing
  3. شركة التجارة للمواد (Aqaba) - Paints, Lighting

  Ready for testing:
  - Product browsing by category
  - Supplier selection with zone-based delivery
  - Cart and checkout flow
  - Vehicle auto-selection

  Test Supplier Accounts (can login with these):
  1. ahmad@almawad.jo / TestPassword123!
  2. mohammad@bina.jo / TestPassword123!
  3. khaled@tijara.jo / TestPassword123!
  ════════════════════════════════════════════════════════════════
  ', 3, 4, v_category_count, v_supplier_count, v_product_count;
END $$;