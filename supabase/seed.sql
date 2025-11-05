-- ==========================================
-- SEED DATA FOR CONTRACTORS MALL
-- ==========================================

-- Clear existing data (for development only)
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
-- VEHICLES
-- ==========================================
INSERT INTO vehicles (id, name_ar, name_en, class_code, max_weight_kg, max_volume_m3, max_length_m, has_open_bed, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'وانيت 1 طن', 'Pickup 1 Ton', 'pickup_1t', 1000, 3.5, 3, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'شاحنة 3.5 طن', 'Truck 3.5 Ton', 'truck_3.5t', 3500, 12, 4.5, false, 2),
  ('33333333-3333-3333-3333-333333333333', 'قلاب مسطح 5 طن', 'Flatbed 5 Ton', 'flatbed_5t', 5000, 18, 6, true, 3);

-- ==========================================
-- SETTINGS
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
-- CATEGORIES
-- ==========================================
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, display_order) VALUES
  ('c1111111-1111-1111-1111-111111111111', NULL, 'مواد بناء عامة', 'General Construction', 'general-construction', 1),
  ('c2222222-2222-2222-2222-222222222222', NULL, 'كهربائيات وإنارة', 'Electrical & Lighting', 'electrical-lighting', 2),
  ('c3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'أسمنت', 'Cement', 'cement', 1),
  ('c4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'حديد', 'Steel', 'steel', 2),
  ('c5555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'رمل وحصى', 'Sand & Gravel', 'sand-gravel', 3),
  ('c6666666-6666-6666-6666-666666666666', 'c2222222-2222-2222-2222-222222222222', 'أسلاك', 'Cables', 'cables', 1),
  ('c7777777-7777-7777-7777-777777777777', 'c2222222-2222-2222-2222-222222222222', 'مفاتيح وقواطع', 'Switches & Breakers', 'switches-breakers', 2);

-- ==========================================
-- SAMPLE TEST DATA (Only for development)
-- ==========================================
-- Note: In production, these would be created through proper registration flow

-- Create test users (these would normally be created via Supabase Auth)
-- For testing, you'll need to create auth users via Supabase dashboard or API

-- Sample supplier profile (requires auth user to exist first)
-- Uncomment and adjust the ID after creating auth user
/*
INSERT INTO profiles (id, role, phone, full_name, preferred_language) VALUES
  ('auth-user-id-here', 'supplier_admin', '+962791234567', 'أحمد الموّاد', 'ar');

-- Sample supplier
INSERT INTO suppliers (
  id, owner_id, business_name, business_name_en, phone, email,
  address, latitude, longitude, radius_km_zone_a, radius_km_zone_b,
  is_verified
) VALUES
  (
    's1111111-1111-1111-1111-111111111111',
    'auth-user-id-here',
    'شركة الموّاد الأردنية',
    'Jordan Materials Co',
    '+962791234567',
    'info@jordanmaterials.jo',
    'شارع المدينة الصناعية، عمان',
    31.9539, 35.9106,
    10, 25,
    true
  );

-- Supplier zone fees
INSERT INTO supplier_zone_fees (supplier_id, zone, vehicle_class_id, base_fee_jod) VALUES
  ('s1111111-1111-1111-1111-111111111111', 'zone_a', '11111111-1111-1111-1111-111111111111', 5.00),
  ('s1111111-1111-1111-1111-111111111111', 'zone_a', '22222222-2222-2222-2222-222222222222', 10.00),
  ('s1111111-1111-1111-1111-111111111111', 'zone_a', '33333333-3333-3333-3333-333333333333', 15.00),
  ('s1111111-1111-1111-1111-111111111111', 'zone_b', '11111111-1111-1111-1111-111111111111', 8.00),
  ('s1111111-1111-1111-1111-111111111111', 'zone_b', '22222222-2222-2222-2222-222222222222', 15.00),
  ('s1111111-1111-1111-1111-111111111111', 'zone_b', '33333333-3333-3333-3333-333333333333', 22.00);

-- Sample products
INSERT INTO products (
  supplier_id, category_id, sku, name_ar, name_en,
  description_ar, description_en, unit_ar, unit_en,
  price_per_unit, weight_kg_per_unit, volume_m3_per_unit,
  min_order_quantity, is_available
) VALUES
  (
    's1111111-1111-1111-1111-111111111111',
    'c3333333-3333-3333-3333-333333333333',
    'CEM-PRT-50',
    'أسمنت بورتلاندي 50 كجم',
    'Portland Cement 50kg',
    'أسمنت بورتلاندي عالي الجودة للأعمال الإنشائية',
    'High quality Portland cement for construction works',
    'كيس',
    'bag',
    4.50,
    50,
    0.035,
    10,
    true
  ),
  (
    's1111111-1111-1111-1111-111111111111',
    'c4444444-4444-4444-4444-444444444444',
    'STL-RBR-12',
    'حديد تسليح 12 ملم',
    'Rebar 12mm',
    'حديد تسليح عالي الجودة قطر 12 ملم',
    'High quality reinforcement steel bar 12mm diameter',
    'طن',
    'ton',
    650.00,
    1000,
    0.089,
    1,
    true
  ),
  (
    's1111111-1111-1111-1111-111111111111',
    'c5555555-5555-5555-5555-555555555555',
    'SND-FIN-M3',
    'رمل ناعم',
    'Fine Sand',
    'رمل ناعم منخول للأعمال الإنشائية',
    'Fine sieved sand for construction works',
    'متر مكعب',
    'm³',
    18.00,
    1600,
    1.0,
    3,
    true
  );
*/

-- ==========================================
-- HELPER FUNCTIONS FOR DEVELOPMENT
-- ==========================================

-- Function to create sample order (for testing)
CREATE OR REPLACE FUNCTION create_sample_order(
  p_contractor_id UUID,
  p_supplier_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  v_order_id := uuid_generate_v4();
  v_order_number := generate_order_number();

  INSERT INTO orders (
    id, order_number, contractor_id, supplier_id,
    status, subtotal_jod, delivery_fee_jod, total_jod,
    delivery_address, delivery_latitude, delivery_longitude,
    scheduled_delivery_date
  ) VALUES (
    v_order_id, v_order_number, p_contractor_id, p_supplier_id,
    'pending', 100.00, 10.00, 110.00,
    'عمان، الدوار السابع',
    31.9539, 35.9106,
    CURRENT_DATE + INTERVAL '1 day'
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- DEVELOPMENT NOTES
-- ==========================================
-- 1. Create auth users via Supabase Dashboard or CLI
-- 2. Update the profile IDs in the commented section above
-- 3. Run this seed file with: supabase db seed
-- 4. For production, remove all test data sections