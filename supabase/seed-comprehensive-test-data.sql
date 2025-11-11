-- ====================================================================================
-- COMPREHENSIVE TEST DATA FOR CONTRACTORS MALL
-- ====================================================================================
-- Purpose: Create realistic test data covering ALL scenarios
-- - Orders in all statuses with notes
-- - Disputes in various states
-- - Payments (pending, held, released, refunded)
-- - Deliveries with photo/PIN confirmation
-- - Reviews and ratings
-- - Projects for organization
--
-- PREREQUISITES:
-- You must first create these auth users via Supabase Dashboard → Authentication → Users:
-- 1. supplier1@contractors.jo / TestSupplier123! (role: supplier_admin)
-- 2. supplier2@contractors.jo / TestSupplier123! (role: supplier_admin)
-- 3. supplier3@contractors.jo / TestSupplier123! (role: supplier_admin)
-- 4. contractor1@test.jo / TestPassword123! (role: contractor)
-- 5. contractor2@test.jo / TestPassword123! (role: contractor)
-- 6. driver1@test.jo / TestDriver123! (role: driver)
-- 7. admin@contractors.jo / TestAdmin123! (role: admin)
--
-- All users should have "Auto Confirm User" checked!
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- CLEANUP: Delete existing test data (makes script re-runnable)
-- ====================================================================================

DO $$
BEGIN
  RAISE NOTICE '🧹 Cleaning up existing test data...';

  -- Delete in reverse order of foreign key dependencies
  DELETE FROM reviews WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN suppliers s ON s.id = o.supplier_id
    WHERE s.email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM disputes WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN suppliers s ON s.id = o.supplier_id
    WHERE s.email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM deliveries WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN suppliers s ON s.id = o.supplier_id
    WHERE s.email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM payments WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN suppliers s ON s.id = o.supplier_id
    WHERE s.email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM order_items WHERE order_id IN (
    SELECT o.id FROM orders o
    JOIN suppliers s ON s.id = o.supplier_id
    WHERE s.email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM orders WHERE supplier_id IN (
    SELECT id FROM suppliers WHERE email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM orders WHERE contractor_id IN (
    SELECT id FROM auth.users WHERE email IN ('contractor1@test.jo', 'contractor2@test.jo')
  );

  DELETE FROM projects WHERE contractor_id IN (
    SELECT id FROM auth.users WHERE email IN ('contractor1@test.jo', 'contractor2@test.jo')
  );

  DELETE FROM products WHERE supplier_id IN (
    SELECT id FROM suppliers WHERE email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo')
  );

  DELETE FROM suppliers WHERE email IN ('supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo');

  DELETE FROM profiles WHERE id IN (
    SELECT id FROM auth.users WHERE email IN (
      'supplier1@contractors.jo', 'supplier2@contractors.jo', 'supplier3@contractors.jo',
      'contractor1@test.jo', 'contractor2@test.jo',
      'driver1@test.jo', 'admin@contractors.jo'
    )
  );

  RAISE NOTICE '  ✓ Cleanup complete';
  RAISE NOTICE '';
END $$;

-- ====================================================================================
-- PART 1: FETCH USER IDS AND CREATE TEST DATA
-- ====================================================================================

DO $$
DECLARE
  supplier1_id UUID;
  supplier2_id UUID;
  supplier3_id UUID;
  contractor1_id UUID;
  contractor2_id UUID;
  driver1_id UUID;
  admin_id UUID;

  cement_cat_id UUID;
  steel_cat_id UUID;
  tiles_cat_id UUID;
  bricks_cat_id UUID;
  sand_cat_id UUID;

  supplier1_db_id UUID;
  supplier2_db_id UUID;
  supplier3_db_id UUID;

  project1_id UUID;
  project2_id UUID;
  project3_id UUID;

  -- Product IDs
  cement_product1_id UUID;
  cement_product2_id UUID;
  steel_product1_id UUID;
  tiles_product1_id UUID;
  bricks_product1_id UUID;
  sand_product1_id UUID;

  -- Order IDs for linking
  order_ids UUID[];
  current_order_id UUID;

BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONTRACTORS MALL - COMPREHENSIVE TEST DATA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Get auth user IDs
  SELECT id INTO supplier1_id FROM auth.users WHERE email = 'supplier1@contractors.jo';
  SELECT id INTO supplier2_id FROM auth.users WHERE email = 'supplier2@contractors.jo';
  SELECT id INTO supplier3_id FROM auth.users WHERE email = 'supplier3@contractors.jo';
  SELECT id INTO contractor1_id FROM auth.users WHERE email = 'contractor1@test.jo';
  SELECT id INTO contractor2_id FROM auth.users WHERE email = 'contractor2@test.jo';
  SELECT id INTO driver1_id FROM auth.users WHERE email = 'driver1@test.jo';
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@contractors.jo';

  -- Verify all users exist
  IF supplier1_id IS NULL OR supplier2_id IS NULL OR supplier3_id IS NULL OR
     contractor1_id IS NULL OR contractor2_id IS NULL OR driver1_id IS NULL OR admin_id IS NULL THEN
    RAISE EXCEPTION '❌ Missing auth users! Please create all required users via Supabase Dashboard first.';
  END IF;

  RAISE NOTICE '✅ All auth users found';
  RAISE NOTICE '';

  -- ====================================================================================
  -- PART 2: CREATE PROFILES
  -- ====================================================================================

  RAISE NOTICE '📝 Creating profiles...';

  INSERT INTO profiles (id, role, phone, full_name, preferred_language, is_active)
  VALUES
    (supplier1_id, 'supplier_admin', '+962791111111', 'مواد البناء الأردنية', 'ar', true),
    (supplier2_id, 'supplier_admin', '+962792222222', 'المورد الذهبي', 'ar', true),
    (supplier3_id, 'supplier_admin', '+962793333333', 'مستودع الإنشاءات', 'ar', true),
    (contractor1_id, 'contractor', '+962795555555', 'أحمد محمود المقاول', 'ar', true),
    (contractor2_id, 'contractor', '+962796666666', 'محمد علي البناء', 'ar', true),
    (driver1_id, 'driver', '+962797777777', 'سائق التوصيل أول', 'ar', true),
    (admin_id, 'admin', '+962798888888', 'مدير النظام', 'ar', true)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  RAISE NOTICE '  ✓ Created 7 profiles';

  -- ====================================================================================
  -- PART 3: CREATE SUPPLIERS
  -- ====================================================================================

  RAISE NOTICE '🏢 Creating suppliers...';

  INSERT INTO suppliers (owner_id, business_name, business_name_en, phone, email, address, latitude, longitude, radius_km_zone_a, radius_km_zone_b, is_verified, verified_at)
  VALUES
    (supplier1_id, 'مواد البناء الأردنية', 'Jordan Building Materials', '+962791111111', 'supplier1@contractors.jo',
     'شارع الملك حسين، وسط البلد، عمان', 31.9566, 35.9450, 15.0, 30.0, true, NOW()),
    (supplier2_id, 'المورد الذهبي', 'Golden Supplier', '+962792222222', 'supplier2@contractors.jo',
     'شارع المدينة المنورة، شرق عمان', 31.9700, 35.9700, 20.0, 40.0, true, NOW()),
    (supplier3_id, 'مستودع الإنشاءات', 'Construction Warehouse', '+962793333333', 'supplier3@contractors.jo',
     'طريق المطار، غرب عمان', 31.9500, 35.8900, 10.0, 25.0, true, NOW());

  -- Get supplier IDs for later use
  SELECT id INTO supplier1_db_id FROM suppliers WHERE owner_id = supplier1_id;
  SELECT id INTO supplier2_db_id FROM suppliers WHERE owner_id = supplier2_id;
  SELECT id INTO supplier3_db_id FROM suppliers WHERE owner_id = supplier3_id;

  RAISE NOTICE '  ✓ Created 3 suppliers';

  -- ====================================================================================
  -- PART 4: CREATE PROJECTS (Contractor Organization)
  -- ====================================================================================

  RAISE NOTICE '📁 Creating projects...';

  INSERT INTO projects (contractor_id, name, description, address, latitude, longitude, budget_estimate, is_active)
  VALUES
    (contractor1_id, 'فيلا عبدون السكنية', 'بناء فيلا سكنية مساحة 500 متر مربع', 'عبدون، عمان', 31.9600, 35.8900, 250000.00, true),
    (contractor1_id, 'عمارة الجبيهة', 'عمارة سكنية 5 طوابق', 'الجبيهة، عمان', 32.0100, 35.8700, 500000.00, true),
    (contractor2_id, 'محل تجاري مرج الحمام', 'محل تجاري مساحة 100 متر', 'مرج الحمام، عمان', 31.8500, 35.8600, 80000.00, true);

  -- Get project IDs
  SELECT id INTO project1_id FROM projects WHERE contractor_id = contractor1_id AND name = 'فيلا عبدون السكنية' LIMIT 1;
  SELECT id INTO project2_id FROM projects WHERE contractor_id = contractor1_id AND name = 'عمارة الجبيهة' LIMIT 1;
  SELECT id INTO project3_id FROM projects WHERE contractor_id = contractor2_id AND name = 'محل تجاري مرج الحمام' LIMIT 1;

  RAISE NOTICE '  ✓ Created 3 projects';

  -- ====================================================================================
  -- PART 5: CREATE/GET CATEGORY IDS
  -- ====================================================================================

  RAISE NOTICE '📂 Ensuring categories exist...';

  -- Create categories if they don't exist
  INSERT INTO categories (slug, name_ar, name_en, icon_name, display_order, is_active)
  VALUES
    ('cement', 'إسمنت ومواد لاصقة', 'Cement & Adhesives', 'cement', 1, true),
    ('steel', 'حديد وحدادة', 'Steel & Iron', 'steel', 2, true),
    ('tiles', 'بلاط وسيراميك', 'Tiles & Ceramics', 'tiles', 3, true),
    ('bricks', 'طوب وبلوك', 'Bricks & Blocks', 'bricks', 4, true),
    ('sand-gravel', 'رمل وحصى', 'Sand & Gravel', 'sand', 5, true)
  ON CONFLICT (slug) DO NOTHING;

  -- Get category IDs
  SELECT id INTO cement_cat_id FROM categories WHERE slug = 'cement' LIMIT 1;
  SELECT id INTO steel_cat_id FROM categories WHERE slug = 'steel' LIMIT 1;
  SELECT id INTO tiles_cat_id FROM categories WHERE slug = 'tiles' LIMIT 1;
  SELECT id INTO bricks_cat_id FROM categories WHERE slug = 'bricks' LIMIT 1;
  SELECT id INTO sand_cat_id FROM categories WHERE slug = 'sand-gravel' LIMIT 1;

  RAISE NOTICE '  ✓ Categories ready';

  -- ====================================================================================
  -- PART 6: CREATE PRODUCTS
  -- ====================================================================================

  RAISE NOTICE '📦 Creating products...';

  -- Supplier 1 Products (مواد البناء الأردنية)
  INSERT INTO products (supplier_id, category_id, sku, name_ar, name_en, description_ar, description_en,
                        unit_ar, unit_en, price_per_unit, weight_kg_per_unit, volume_m3_per_unit, stock_quantity, is_available)
  VALUES
    (supplier1_db_id, cement_cat_id, 'CEM-PORT-50', 'إسمنت بورتلاندي 50 كغم', 'Portland Cement 50kg',
     'إسمنت بورتلاندي عالي الجودة مطابق للمواصفات', 'High quality Portland cement',
     'كيس', 'bag', 5.50, 50.0, 0.04, 500, true),

    (supplier1_db_id, cement_cat_id, 'CEM-WHITE-25', 'إسمنت أبيض 25 كغم', 'White Cement 25kg',
     'إسمنت أبيض للتشطيبات والديكورات', 'White cement for finishing',
     'كيس', 'bag', 12.00, 25.0, 0.02, 200, true),

    (supplier1_db_id, steel_cat_id, 'STEEL-REBAR-12', 'حديد تسليح 12 ملم', 'Rebar 12mm',
     'حديد تسليح 12 ملم طول 12 متر', '12mm rebar 12m length',
     'طن', 'ton', 650.00, 1000.0, 0.15, 50, true),

    (supplier1_db_id, bricks_cat_id, 'BRICK-RED', 'طوب أحمر', 'Red Brick',
     'طوب أحمر بناء 20x10x6 سم', 'Red building brick',
     'ألف حبة', 'thousand pieces', 180.00, 2500.0, 1.2, 20, true),

    (supplier1_db_id, sand_cat_id, 'SAND-FINE', 'رمل ناعم', 'Fine Sand',
     'رمل ناعم للبناء والطوبار', 'Fine sand for construction',
     'متر مكعب', 'm³', 25.00, 1600.0, 1.0, 100, true);

  -- Supplier 2 Products (المورد الذهبي)
  INSERT INTO products (supplier_id, category_id, sku, name_ar, name_en, description_ar, unit_ar, unit_en,
                        price_per_unit, weight_kg_per_unit, volume_m3_per_unit, stock_quantity, is_available)
  VALUES
    (supplier2_db_id, tiles_cat_id, 'TILE-FLOOR-60', 'بلاط أرضيات 60×60', 'Floor Tiles 60x60',
     'بلاط بورسلان أرضيات فاخر', 'متر مربع', 'm²', 35.00, 20.0, 0.05, 150, true),

    (supplier2_db_id, tiles_cat_id, 'TILE-WALL-30', 'بلاط جدران 30×60', 'Wall Tiles 30x60',
     'بلاط سيراميك جدران', 'متر مربع', 'm²', 28.00, 15.0, 0.03, 200, true),

    (supplier2_db_id, cement_cat_id, 'CEM-RESIST', 'إسمنت مقاوم', 'Resistant Cement',
     'إسمنت مقاوم للكبريتات', 'كيس', 'bag', 6.50, 50.0, 0.04, 8, true), -- Low stock!

    (supplier2_db_id, steel_cat_id, 'STEEL-MESH', 'شبك حديد 6 ملم', 'Steel Mesh 6mm',
     'شبك حديد لاصة 6 ملم', 'لوح', 'sheet', 45.00, 50.0, 0.02, 100, true);

  -- Supplier 3 Products (مستودع الإنشاءات)
  INSERT INTO products (supplier_id, category_id, sku, name_ar, name_en, description_ar, unit_ar, unit_en,
                        price_per_unit, weight_kg_per_unit, volume_m3_per_unit, stock_quantity, is_available)
  VALUES
    (supplier3_db_id, bricks_cat_id, 'BLOCK-20', 'بلوك إسمنتي 20 سم', 'Concrete Block 20cm',
     'بلوك إسمنتي 20×20×40', 'حبة', 'piece', 1.20, 15.0, 0.016, 5000, true),

    (supplier3_db_id, sand_cat_id, 'GRAVEL-MIX', 'حصى مخلوط', 'Mixed Gravel',
     'حصى مخلوط للخرسانة', 'متر مكعب', 'm³', 30.00, 1700.0, 1.0, 60, true),

    (supplier3_db_id, steel_cat_id, 'STEEL-REBAR-16', 'حديد تسليح 16 ملم', 'Rebar 16mm',
     'حديد تسليح 16 ملم', 'طن', 'ton', 670.00, 1000.0, 0.15, 7, true); -- Low stock!

  RAISE NOTICE '  ✓ Created 12 products (2 with low stock)';

  -- ====================================================================================
  -- PART 7: CREATE COMPREHENSIVE ORDERS
  -- ====================================================================================

  RAISE NOTICE '📋 Creating comprehensive orders...';

  -- Helper function to generate order number
  CREATE TEMP TABLE IF NOT EXISTS temp_order_counter (counter INT DEFAULT 1000);
  INSERT INTO temp_order_counter VALUES (1000);

  -- ORDER 1: PENDING - Small cement order (<120 JOD)
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor1_id, supplier1_db_id, project1_id, 'CM100001', 'pending',
          45.00, 5.00, 50.00, 'zone_a',
          'فيلا عبدون - شارع الكلية العلمية', 31.9600, 35.8900,
          CURRENT_DATE + INTERVAL '2 days', 'morning',
          'يرجى الاتصال قبل التوصيل بنصف ساعة - مشروع فيلا سكنية',
          NOW() - INTERVAL '3 hours')
  RETURNING id INTO current_order_id;

  -- Add order items for ORDER 1
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, weight_kg, volume_m3)
  SELECT current_order_id, id, 8, 5.50, 44.00, 400.0, 0.32
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'CEM-PORT-50';

  -- Create payment for ORDER 1
  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, created_at)
  VALUES (current_order_id, 'pi_test_CM100001', 'card', 'pending', 50.00, NOW() - INTERVAL '3 hours');

  -- ORDER 2: CONFIRMED - Medium order with PIN threshold (>= 120 JOD)
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor1_id, supplier2_db_id, project1_id, 'CM100002', 'confirmed',
          245.00, 7.00, 252.00, 'zone_b',
          'فيلا عبدون - البوابة الرئيسية', 31.9600, 35.8900,
          CURRENT_DATE + INTERVAL '1 day', 'afternoon',
          'طلبية بلاط للصالة - يوجد ونش رفع - الرجاء إحضار المواد للطابق الثاني',
          NOW() - INTERVAL '5 hours')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, weight_kg, volume_m3)
  SELECT current_order_id, id, 7, 35.00, 245.00, 140.0, 0.35
  FROM products WHERE supplier_id = supplier2_db_id AND sku = 'TILE-FLOOR-60';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100002', 'card', 'held', 252.00, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours');

  -- ORDER 3: CONFIRMED - Steel rebar (heavy, requires open bed)
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor1_id, supplier1_db_id, project2_id, 'CM100003', 'confirmed',
          650.00, 10.00, 660.00, 'zone_a',
          'عمارة الجبيهة - قرب مسجد الجبيهة', 32.0100, 35.8700,
          CURRENT_DATE + INTERVAL '1 day', 'morning',
          'حديد تسليح للأساسات - يوجد رافعة في الموقع - طلب عاجل',
          NOW() - INTERVAL '1 day')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, weight_kg)
  SELECT current_order_id, id, 1, 650.00, 650.00, 1000.0
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'STEEL-REBAR-12';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100003', 'card', 'held', 660.00, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

  -- ORDER 4: IN_DELIVERY - Currently being delivered
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time,
                     created_at)
  VALUES (contractor1_id, supplier1_db_id, project1_id, 'CM100004', 'in_delivery',
          110.00, 5.00, 115.00, 'zone_a',
          'فيلا عبدون - مدخل الخدمات', 31.9600, 35.8900,
          CURRENT_DATE, 'morning',
          NOW() - INTERVAL '3 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 20, 5.50, 110.00
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'CEM-PORT-50';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100004', 'card', 'held', 115.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

  -- Create delivery record (in progress)
  INSERT INTO deliveries (order_id, driver_id, driver_name, driver_phone, vehicle_plate_number, started_at, notes)
  VALUES (current_order_id, driver1_id, 'سائق التوصيل أول', '+962797777777', 'أ ص ط 12345', NOW() - INTERVAL '1 hour',
          'الطلبية في الطريق - سيصل خلال 30 دقيقة');

  -- ORDER 5: DELIVERED - Awaiting payment release (small order, photo proof)
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time,
                     created_at)
  VALUES (contractor2_id, supplier3_db_id, project3_id, 'CM100005', 'delivered',
          90.00, 5.00, 95.00, 'zone_a',
          'محل تجاري مرج الحمام', 31.8500, 35.8600,
          CURRENT_DATE - INTERVAL '1 day', 'afternoon',
          NOW() - INTERVAL '5 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 3, 30.00, 90.00
  FROM products WHERE supplier_id = supplier3_db_id AND sku = 'GRAVEL-MIX';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100005', 'card', 'held', 95.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

  -- Create delivery with photo proof
  INSERT INTO deliveries (order_id, driver_id, started_at, completed_at, proof_photo_url, recipient_name, recipient_phone, notes)
  VALUES (current_order_id, driver1_id, NOW() - INTERVAL '1 day' - INTERVAL '2 hours', NOW() - INTERVAL '1 day',
          'https://storage.supabase.co/delivery-proofs/CM100005_proof.jpg',
          'محمد علي', '+962796666666',
          'تم التوصيل والتفريغ بنجاح - صورة إثبات التسليم مرفقة');

  -- ORDER 6: DELIVERED - High value, PIN verification required (>=120 JOD)
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor1_id, supplier2_db_id, project1_id, 'CM100006', 'delivered',
          560.00, 7.00, 567.00, 'zone_b',
          'فيلا عبدون', 31.9600, 35.8900,
          CURRENT_DATE - INTERVAL '2 days', 'morning',
          'بلاط للفيلا بالكامل - طلبية كبيرة',
          NOW() - INTERVAL '7 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 16, 35.00, 560.00
  FROM products WHERE supplier_id = supplier2_db_id AND sku = 'TILE-FLOOR-60';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100006', 'card', 'held', 567.00, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');

  -- Create delivery with PIN verification
  INSERT INTO deliveries (order_id, driver_id, started_at, completed_at, confirmation_pin, pin_verified, recipient_name, recipient_phone, notes)
  VALUES (current_order_id, driver1_id, NOW() - INTERVAL '2 days' - INTERVAL '3 hours', NOW() - INTERVAL '2 days',
          '1234', true, 'أحمد محمود', '+962795555555',
          'تم التوصيل والتأكيد برقم PIN بنجاح - المقاول وقع على الإيصال');

  -- ORDER 7: COMPLETED - Payment released
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time,
                     created_at)
  VALUES (contractor1_id, supplier1_db_id, project1_id, 'CM100007', 'completed',
          220.00, 5.00, 225.00, 'zone_a',
          'فيلا عبدون', 31.9600, 35.8900,
          CURRENT_DATE - INTERVAL '10 days', 'afternoon',
          NOW() - INTERVAL '14 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 40, 5.50, 220.00
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'CEM-PORT-50';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, released_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100007', 'card', 'released', 225.00,
          NOW() - INTERVAL '14 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '14 days');

  INSERT INTO deliveries (order_id, driver_id, started_at, completed_at, proof_photo_url, recipient_name, recipient_phone)
  VALUES (current_order_id, driver1_id, NOW() - INTERVAL '10 days' - INTERVAL '2 hours', NOW() - INTERVAL '10 days',
          'https://storage.supabase.co/delivery-proofs/CM100007_proof.jpg',
          'أحمد محمود', '+962795555555');

  -- Create review for completed order
  INSERT INTO reviews (order_id, contractor_id, supplier_id, rating, comment)
  VALUES (current_order_id, contractor1_id, supplier1_db_id, 5,
          'خدمة ممتازة، التوصيل في الموعد، والإسمنت بجودة عالية. أنصح بالتعامل معهم');

  -- ORDER 8: COMPLETED - Another completed order with review
  INSERT INTO orders (contractor_id, supplier_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time,
                     created_at)
  VALUES (contractor1_id, supplier2_db_id, 'CM100008', 'completed',
          280.00, 7.00, 287.00, 'zone_b',
          'عمارة الجبيهة', 32.0100, 35.8700,
          CURRENT_DATE - INTERVAL '15 days', 'morning',
          NOW() - INTERVAL '20 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 10, 28.00, 280.00
  FROM products WHERE supplier_id = supplier2_db_id AND sku = 'TILE-WALL-30';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, released_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100008', 'card', 'released', 287.00,
          NOW() - INTERVAL '20 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '20 days');

  INSERT INTO deliveries (order_id, started_at, completed_at, proof_photo_url)
  VALUES (current_order_id, NOW() - INTERVAL '15 days' - INTERVAL '1 hour', NOW() - INTERVAL '15 days',
          'https://storage.supabase.co/delivery-proofs/CM100008_proof.jpg');

  INSERT INTO reviews (order_id, contractor_id, supplier_id, rating, comment)
  VALUES (current_order_id, contractor1_id, supplier2_db_id, 4,
          'جودة البلاط ممتازة ولكن تأخر السائق قليلاً عن الموعد');

  -- ORDER 9: CANCELLED - Contractor cancelled before delivery
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor2_id, supplier1_db_id, project3_id, 'CM100009', 'cancelled',
          165.00, 5.00, 170.00, 'zone_a',
          'محل تجاري مرج الحمام', 31.8500, 35.8600,
          CURRENT_DATE + INTERVAL '3 days', 'afternoon',
          'تم تغيير المخطط - الإلغاء بسبب تعديل في التصميم',
          NOW() - INTERVAL '2 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 30, 5.50, 165.00
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'CEM-PORT-50';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, refunded_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100009', 'card', 'refunded', 170.00,
          NOW() - INTERVAL '2 days' + INTERVAL '3 hours', NOW() - INTERVAL '2 days');

  -- ORDER 10: COMPLETED - With high rating
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor1_id, supplier3_db_id, project2_id, 'CM100010', 'completed',
          6000.00, 10.00, 6010.00, 'zone_a',
          'عمارة الجبيهة - الطابق الأرضي', 32.0100, 35.8700,
          CURRENT_DATE - INTERVAL '25 days', 'morning',
          'بلوك للعمارة بالكامل - طلبية ضخمة',
          NOW() - INTERVAL '30 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 5000, 1.20, 6000.00
  FROM products WHERE supplier_id = supplier3_db_id AND sku = 'BLOCK-20';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, released_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100010', 'card', 'released', 6010.00,
          NOW() - INTERVAL '30 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '30 days');

  INSERT INTO deliveries (order_id, driver_id, started_at, completed_at, confirmation_pin, pin_verified, recipient_name, recipient_phone, notes)
  VALUES (current_order_id, driver1_id, NOW() - INTERVAL '25 days' - INTERVAL '4 hours', NOW() - INTERVAL '25 days',
          '9876', true, 'أحمد محمود', '+962795555555',
          'طلبية ضخمة تم توصيلها على دفعتين - كل شيء تمام');

  INSERT INTO reviews (order_id, contractor_id, supplier_id, rating, comment)
  VALUES (current_order_id, contractor1_id, supplier3_db_id, 5,
          'احترافية عالية جداً - البلوك بجودة ممتازة والتوصيل كان منظم رغم حجم الطلبية');

  -- ====================================================================================
  -- PART 8: CREATE DISPUTES
  -- ====================================================================================

  RAISE NOTICE '⚠️  Creating disputes...';

  -- Get an order ID for dispute (let's create a new delivered order with issue)
  INSERT INTO orders (contractor_id, supplier_id, project_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES (contractor1_id, supplier2_db_id, project1_id, 'CM100011', 'delivered',
          420.00, 7.00, 427.00, 'zone_b',
          'فيلا عبدون', 31.9600, 35.8900,
          CURRENT_DATE - INTERVAL '5 days', 'afternoon',
          'بلاط ممتاز - تم التأكيد بالكامل',
          NOW() - INTERVAL '8 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 12, 35.00, 420.00
  FROM products WHERE supplier_id = supplier2_db_id AND sku = 'TILE-FLOOR-60';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100011', 'card', 'held', 427.00,
          NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days');

  INSERT INTO deliveries (order_id, started_at, completed_at, confirmation_pin, pin_verified, recipient_name, recipient_phone)
  VALUES (current_order_id, NOW() - INTERVAL '5 days' - INTERVAL '2 hours', NOW() - INTERVAL '5 days',
          '5678', true, 'أحمد محمود', '+962795555555');

  -- Dispute 1: OPENED - Quality issue (high value, needs site visit)
  INSERT INTO disputes (order_id, opened_by, status, reason, description,
                       site_visit_required, created_at)
  VALUES (current_order_id, contractor1_id, 'opened',
          'مشكلة في الجودة - عيوب في البلاط',
          'تم اكتشاف عيوب في 3 كراتين من البلاط بعد الفتح - يوجد كسور وتشققات في عدة قطع. المورد يدعي أن البلاط كان سليماً عند التسليم. الطلبية بقيمة 427 دينار وتحتاج لزيارة موقع للتحقق.',
          true,
          NOW() - INTERVAL '4 days');

  -- Dispute 2: INVESTIGATING - Delivery issue
  INSERT INTO orders (contractor_id, supplier_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time,
                     created_at)
  VALUES (contractor2_id, supplier3_db_id, 'CM100012', 'delivered',
          150.00, 5.00, 155.00, 'zone_a',
          'محل تجاري مرج الحمام', 31.8500, 35.8600,
          CURRENT_DATE - INTERVAL '12 days', 'morning',
          NOW() - INTERVAL '15 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 5, 30.00, 150.00
  FROM products WHERE supplier_id = supplier3_db_id AND sku = 'GRAVEL-MIX';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100012', 'card', 'held', 155.00,
          NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

  INSERT INTO deliveries (order_id, started_at, completed_at, proof_photo_url)
  VALUES (current_order_id, NOW() - INTERVAL '12 days' - INTERVAL '1 hour', NOW() - INTERVAL '12 days',
          'https://storage.supabase.co/delivery-proofs/CM100012_proof.jpg');

  INSERT INTO disputes (order_id, opened_by, status, reason, description, qc_notes,
                       site_visit_required, created_at)
  VALUES (current_order_id, contractor2_id, 'investigating',
          'كمية ناقصة - الحصى أقل من المطلوب',
          'تم طلب 5 متر مكعب حصى ولكن الكمية المستلمة حوالي 4 متر فقط. السائق يقول أن الكمية كاملة لكن القياس في الموقع يظهر نقص.',
          'تم مراجعة فاتورة الشراء من المورد - الكمية المشحونة 5 متر. جاري التنسيق لزيارة الموقع للقياس.',
          false,
          NOW() - INTERVAL '10 days');

  -- Dispute 3: RESOLVED - Resolved in favor of contractor
  INSERT INTO orders (contractor_id, supplier_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time,
                     created_at)
  VALUES (contractor1_id, supplier1_db_id, 'CM100013', 'completed',
          96.00, 5.00, 101.00, 'zone_a',
          'فيلا عبدون', 31.9600, 35.8900,
          CURRENT_DATE - INTERVAL '20 days', 'afternoon',
          NOW() - INTERVAL '22 days')
  RETURNING id INTO current_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 8, 12.00, 96.00
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'CEM-WHITE-25';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, held_at, refunded_at, created_at)
  VALUES (current_order_id, 'pi_test_CM100013', 'card', 'refunded', 101.00,
          NOW() - INTERVAL '22 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '22 days');

  INSERT INTO deliveries (order_id, started_at, completed_at, proof_photo_url)
  VALUES (current_order_id, NOW() - INTERVAL '20 days' - INTERVAL '1 hour', NOW() - INTERVAL '20 days',
          'https://storage.supabase.co/delivery-proofs/CM100013_proof.jpg');

  INSERT INTO disputes (order_id, opened_by, status, reason, description, qc_notes, qc_action,
                       site_visit_required, site_visit_completed, resolution, resolved_at, created_at)
  VALUES (current_order_id, contractor1_id, 'resolved',
          'منتج خاطئ - إسمنت رمادي بدلاً من أبيض',
          'تم طلب إسمنت أبيض ولكن تم توصيل إسمنت رمادي بالخطأ. تم اكتشاف الخطأ بعد التوصيل مباشرة.',
          'تم التحقق من الطلبية - خطأ من المستودع في الشحن. المورد اعترف بالخطأ.',
          'استرجاع كامل المبلغ للمقاول',
          false, false,
          'تم استرجاع المبلغ بالكامل للمقاول. المورد استلم الإسمنت الخاطئ وقدم اعتذار.',
          NOW() - INTERVAL '18 days',
          NOW() - INTERVAL '21 days');

  RAISE NOTICE '  ✓ Created 3 disputes (opened, investigating, resolved)';

  -- ====================================================================================
  -- PART 9: MORE ORDERS FOR VARIETY
  -- ====================================================================================

  RAISE NOTICE '📦 Creating additional orders for variety...';

  -- A few more pending orders (today)
  INSERT INTO orders (contractor_id, supplier_id, order_number, status,
                     subtotal_jod, delivery_fee_jod, total_jod, delivery_zone,
                     delivery_address, delivery_latitude, delivery_longitude,
                     scheduled_delivery_date, scheduled_delivery_time, notes,
                     created_at)
  VALUES
    (contractor1_id, supplier1_db_id, 'CM100014', 'pending',
     360.00, 5.00, 365.00, 'zone_a',
     'عمارة الجبيهة', 32.0100, 35.8700,
     CURRENT_DATE + INTERVAL '1 day', 'morning',
     'طوب أحمر للطابق الثالث - يرجى التنسيق مع المهندس',
     NOW() - INTERVAL '2 hours'),

    (contractor2_id, supplier2_db_id, 'CM100015', 'pending',
     180.00, 7.00, 187.00, 'zone_b',
     'محل تجاري مرج الحمام', 31.8500, 35.8600,
     CURRENT_DATE + INTERVAL '3 days', 'afternoon',
     'شبك حديد للسور',
     NOW() - INTERVAL '30 minutes');

  -- Get order IDs for items
  SELECT id INTO current_order_id FROM orders WHERE order_number = 'CM100014';
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, weight_kg)
  SELECT current_order_id, id, 2, 180.00, 360.00, 5000.0
  FROM products WHERE supplier_id = supplier1_db_id AND sku = 'BRICK-RED';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, created_at)
  VALUES (current_order_id, 'pi_test_CM100014', 'card', 'pending', 365.00, NOW() - INTERVAL '2 hours');

  SELECT id INTO current_order_id FROM orders WHERE order_number = 'CM100015';
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT current_order_id, id, 4, 45.00, 180.00
  FROM products WHERE supplier_id = supplier2_db_id AND sku = 'STEEL-MESH';

  INSERT INTO payments (order_id, payment_intent_id, payment_method, status, amount_jod, created_at)
  VALUES (current_order_id, 'pi_test_CM100015', 'card', 'pending', 187.00, NOW() - INTERVAL '30 minutes');

  RAISE NOTICE '  ✓ Created 2 additional pending orders';

  -- ====================================================================================
  -- SUMMARY
  -- ====================================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TEST DATA CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 7 user profiles (3 suppliers, 2 contractors, 1 driver, 1 admin)';
  RAISE NOTICE '  - 3 suppliers with realistic business info';
  RAISE NOTICE '  - 3 contractor projects';
  RAISE NOTICE '  - 12 products (2 with low stock for alerts)';
  RAISE NOTICE '  - 15 orders in various statuses:';
  RAISE NOTICE '    * 3 pending';
  RAISE NOTICE '    * 2 confirmed';
  RAISE NOTICE '    * 1 in_delivery';
  RAISE NOTICE '    * 3 delivered (awaiting payment)';
  RAISE NOTICE '    * 5 completed (with reviews)';
  RAISE NOTICE '    * 1 cancelled';
  RAISE NOTICE '  - 9 deliveries (photo proof & PIN verified)';
  RAISE NOTICE '  - 15 payments (pending, held, released, refunded)';
  RAISE NOTICE '  - 3 disputes (opened, investigating, resolved)';
  RAISE NOTICE '  - 4 reviews (ratings 4-5 stars)';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Accounts:';
  RAISE NOTICE '  Suppliers:';
  RAISE NOTICE '    - supplier1@contractors.jo / TestSupplier123!';
  RAISE NOTICE '    - supplier2@contractors.jo / TestSupplier123!';
  RAISE NOTICE '    - supplier3@contractors.jo / TestSupplier123!';
  RAISE NOTICE '  Contractors:';
  RAISE NOTICE '    - contractor1@test.jo / TestPassword123!';
  RAISE NOTICE '    - contractor2@test.jo / TestPassword123!';
  RAISE NOTICE '  Driver:';
  RAISE NOTICE '    - driver1@test.jo / TestDriver123!';
  RAISE NOTICE '  Admin:';
  RAISE NOTICE '    - admin@contractors.jo / TestAdmin123!';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test:';
  RAISE NOTICE '  ✓ Supplier dashboards (metrics, orders, products)';
  RAISE NOTICE '  ✓ Contractor orders (all statuses)';
  RAISE NOTICE '  ✓ Delivery confirmation (photo & PIN)';
  RAISE NOTICE '  ✓ Payment states (held, released, refunded)';
  RAISE NOTICE '  ✓ Disputes (opened, investigating, resolved)';
  RAISE NOTICE '  ✓ Reviews and ratings';
  RAISE NOTICE '  ✓ Low stock alerts';
  RAISE NOTICE '';

END $$;

COMMIT;

-- ====================================================================================
-- VERIFICATION QUERIES (optional - comment out if not needed)
-- ====================================================================================

-- Check created data
SELECT 'Orders by Status' as report, status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'in_delivery' THEN 3
    WHEN 'delivered' THEN 4
    WHEN 'completed' THEN 5
    WHEN 'cancelled' THEN 6
  END;

SELECT 'Payments by Status' as report, status, COUNT(*) as count, SUM(amount_jod) as total_jod
FROM payments
GROUP BY status;

SELECT 'Disputes by Status' as report, status, COUNT(*) as count
FROM disputes
GROUP BY status;

SELECT 'Orders with Notes' as report, COUNT(*) as count
FROM orders
WHERE notes IS NOT NULL AND notes != '';

SELECT 'Reviews Count' as report, COUNT(*) as count, AVG(rating)::NUMERIC(3,2) as avg_rating
FROM reviews;
