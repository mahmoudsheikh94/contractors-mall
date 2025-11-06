-- ============================================================================
-- CLEAR ALL TEST DATA FROM SUPABASE
-- ============================================================================
-- This script removes all user-generated test data while preserving:
-- - Categories (seed data)
-- - Vehicle classes (configuration)
-- - Settings (thresholds, commission, etc.)
--
-- IMPORTANT: This is IRREVERSIBLE. Use only in development/testing.
-- ============================================================================

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- ============================================================================
-- STEP 1: Clear child/dependent tables first (foreign key constraints)
-- ============================================================================

-- Clear dispute-related data
TRUNCATE TABLE dispute_communications CASCADE;
TRUNCATE TABLE dispute_site_visits CASCADE;
TRUNCATE TABLE disputes CASCADE;

-- Clear delivery-related data
TRUNCATE TABLE deliveries CASCADE;

-- Clear order-related data
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE order_communications CASCADE;
TRUNCATE TABLE order_notes CASCADE;
TRUNCATE TABLE order_tags CASCADE;

-- Clear payment data
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE wallet_transactions CASCADE;

-- Clear orders
TRUNCATE TABLE orders CASCADE;

-- Clear product-related data
TRUNCATE TABLE products CASCADE;

-- Clear supplier data
TRUNCATE TABLE supplier_zone_fees CASCADE;
TRUNCATE TABLE supplier_profiles CASCADE;

-- Clear notification data
TRUNCATE TABLE notifications CASCADE;

-- Clear user profiles (but keep auth.users for now)
TRUNCATE TABLE profiles CASCADE;

-- ============================================================================
-- STEP 2: Clear auth.users (Supabase Auth)
-- ============================================================================
-- Note: This requires special handling as auth.users is managed by Supabase Auth

DELETE FROM auth.users;

-- ============================================================================
-- STEP 3: Reset sequences (optional - for clean IDs starting from 1)
-- ============================================================================

-- Reset sequences for tables that use SERIAL/BIGSERIAL
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS deliveries_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS disputes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS wallet_transactions_id_seq RESTART WITH 1;

-- ============================================================================
-- STEP 4: Re-enable triggers
-- ============================================================================

SET session_replication_role = DEFAULT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the cleanup was successful:

-- Check user counts (should be 0)
SELECT 'Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM supplier_profiles
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'Disputes', COUNT(*) FROM disputes
UNION ALL

-- Check preserved data (should have counts)
SELECT 'Categories (preserved)', COUNT(*) FROM categories
UNION ALL
SELECT 'Vehicle Classes (preserved)', COUNT(*) FROM vehicle_classes
UNION ALL
SELECT 'Settings (preserved)', COUNT(*) FROM settings;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Test data cleared successfully!';
  RAISE NOTICE '✅ Configuration data preserved (categories, vehicles, settings)';
  RAISE NOTICE '✅ Ready for fresh testing';
END $$;
