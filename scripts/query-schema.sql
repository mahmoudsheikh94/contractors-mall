-- Check supplier_zone_fees structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'supplier_zone_fees'
ORDER BY ordinal_position;

-- Check for vehicle_class_id foreign key
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'supplier_zone_fees'::regclass;

-- Check order_items nullability
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('product_name', 'unit');

-- Check RLS on critical tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'orders', 'order_items', 'suppliers');

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check enums
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'order_status', 'delivery_zone', 'payment_status')
GROUP BY t.typname;
