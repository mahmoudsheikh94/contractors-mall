-- ============================================
-- Seed Test Data for Development
-- Date: 2025-11-04
-- Purpose: Populate database with test categories and sample data
-- ============================================

BEGIN;

-- ==========================================
-- CATEGORIES
-- ==========================================

-- Insert main categories (if not exist)
INSERT INTO categories (name_ar, name_en, slug, icon_name, display_order, is_active)
VALUES
  ('أسمنت', 'Cement', 'cement', '🏗️', 1, true),
  ('حديد وصلب', 'Steel & Iron', 'steel', '🔩', 2, true),
  ('بلاط وسيراميك', 'Tiles & Ceramics', 'tiles', '🔲', 3, true),
  ('طوب وبلوك', 'Bricks & Blocks', 'bricks', '🧱', 4, true),
  ('رمل وحصى', 'Sand & Gravel', 'sand-gravel', '⛰️', 5, true),
  ('خشب', 'Wood', 'wood', '🪵', 6, true),
  ('دهانات', 'Paints', 'paints', '🎨', 7, true),
  ('سباكة وصحية', 'Plumbing & Sanitary', 'plumbing', '🚰', 8, true),
  ('كهرباء', 'Electrical', 'electrical', '💡', 9, true),
  ('عزل', 'Insulation', 'insulation', '🛡️', 10, true)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order;

-- Insert subcategories for Cement
INSERT INTO categories (parent_id, name_ar, name_en, slug, display_order, is_active)
SELECT id, 'أسمنت بورتلاندي', 'Portland Cement', 'portland-cement', 1, true
FROM categories WHERE slug = 'cement'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (parent_id, name_ar, name_en, slug, display_order, is_active)
SELECT id, 'أسمنت أبيض', 'White Cement', 'white-cement', 2, true
FROM categories WHERE slug = 'cement'
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Steel
INSERT INTO categories (parent_id, name_ar, name_en, slug, display_order, is_active)
SELECT id, 'حديد تسليح', 'Reinforcement Steel', 'rebar', 1, true
FROM categories WHERE slug = 'steel'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (parent_id, name_ar, name_en, slug, display_order, is_active)
SELECT id, 'شبك حديد', 'Steel Mesh', 'steel-mesh', 2, true
FROM categories WHERE slug = 'steel'
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Tiles
INSERT INTO categories (parent_id, name_ar, name_en, slug, display_order, is_active)
SELECT id, 'بلاط أرضيات', 'Floor Tiles', 'floor-tiles', 1, true
FROM categories WHERE slug = 'tiles'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (parent_id, name_ar, name_en, slug, display_order, is_active)
SELECT id, 'بلاط جدران', 'Wall Tiles', 'wall-tiles', 2, true
FROM categories WHERE slug = 'tiles'
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- VERIFICATION MESSAGE
-- ==========================================

DO $$
DECLARE
  cat_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM categories;

  RAISE NOTICE '';
  RAISE NOTICE '=== Seed Data Created Successfully ==='';
  RAISE NOTICE 'Total categories: %', cat_count;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Add products to these categories';
  RAISE NOTICE '2. Test the product management features';
  RAISE NOTICE '3. Create orders for testing delivery confirmation';
  RAISE NOTICE '';
END $$;

COMMIT;
