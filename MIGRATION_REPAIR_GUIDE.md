# Migration Repair & Push Guide

Since the Supabase CLI is experiencing connection timeouts, follow these steps to manually fix the migration history and apply pending migrations.

## Step 1: Run the Vehicle Removal Hotfix

**URL**: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

**Copy & paste** the contents of `HOTFIX_VEHICLE_CLASS_REMOVAL.sql` and click **Run**.

This will:
- Remove `vehicle_class_id` column from `supplier_zone_fees`
- Fix the TypeScript type mismatch causing Vercel builds to fail

## Step 2: Repair Migration History (Optional - if you want clean migration tracking)

If you want to sync the migration history properly, run this in Supabase SQL Editor:

```sql
-- Clear duplicate migration version (20250126 from old file)
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20250126';

-- Mark all new timestamped migrations as applied
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20250126100000', '20250126100000_add_missing_rls_policies', ARRAY[]::text[]),
  ('20250127', '20250127_fix_rls_policies', ARRAY[]::text[]),
  ('20250128100000', '20250128100000_complete_auth_fix', ARRAY[]::text[]),
  ('20250128110000', '20250128110000_emergency_fix_recursion', ARRAY[]::text[]),
  ('20250129', '20250129_complete_schema_fix', ARRAY[]::text[]),
  ('20250201', '20250201_remove_vehicle_system', ARRAY[]::text[]),
  ('20251030100000', '20251030100000_create_core_tables', ARRAY[]::text[]),
  ('20251030110000', '20251030110000_phase4_delivery_confirmation', ARRAY[]::text[]),
  ('20251031100000', '20251031100000_transform_to_new_schema', ARRAY[]::text[]),
  ('20251031110000', '20251031110000_add_email_verification', ARRAY[]::text[]),
  ('20251031120000', '20251031120000_add_supplier_details_columns', ARRAY[]::text[]),
  ('20251031130000', '20251031130000_auto_create_profile_trigger', ARRAY[]::text[]),
  ('20251031140000', '20251031140000_auto_create_profile_trigger_v2', ARRAY[]::text[]),
  ('20251031150000', '20251031150000_fix_registration_rls_policies', ARRAY[]::text[]),
  ('20251103', '20251103_create_storage_buckets', ARRAY[]::text[]),
  ('20251104100000', '20251104100000_create_admin_user', ARRAY[]::text[]),
  ('20251104110000', '20251104110000_seed_test_data', ARRAY[]::text[]),
  ('20251105100000', '20251105100000_fix_rls_circular_dependency', ARRAY[]::text[]),
  ('20251105110000', '20251105110000_phase_2c_order_enhancements', ARRAY[]::text[]),
  ('20251105120000', '20251105120000_phase_2c_order_enhancements_FIXED', ARRAY[]::text[]),
  ('20251105130000', '20251105130000_phase_2c_2d_insights_messaging', ARRAY[]::text[]),
  ('20251106100000', '20251106100000_cleanup_phone_verification', ARRAY[]::text[]),
  ('20251106110000', '20251106110000_fix_vehicle_type_nullable', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

-- Verify
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version > '20250125'
ORDER BY version;
```

## Step 3: Regenerate TypeScript Types (Local)

After running the hotfix SQL, regenerate your local TypeScript types:

```bash
npx supabase gen types typescript --linked > types/supabase.ts
```

Or if you don't have a types file setup, the types will auto-regenerate on next deployment.

## Step 4: Verify & Deploy

1. **Check Supabase schema**: Verify `supplier_zone_fees` no longer has `vehicle_class_id`
2. **Push code to GitHub**: `git push origin main`
3. **Vercel will auto-deploy** and the build should now succeed!

## What This Fixes

- ✅ Removes `vehicle_class_id` from `supplier_zone_fees` table
- ✅ TypeScript types will match actual database schema
- ✅ Vercel build errors will be resolved
- ✅ Migration history will be clean and tracked properly

## Verification

After running Step 1 (hotfix), verify in Supabase Table Editor:

1. Go to `supplier_zone_fees` table
2. Check columns - should only have: `id`, `supplier_id`, `zone`, `base_fee_jod`, `created_at`, `updated_at`
3. No `vehicle_class_id` column

## Alternative: Quick Fix Only

If you just want to fix the Vercel build ASAP and don't care about migration history tracking:

**Just run Step 1 (HOTFIX_VEHICLE_CLASS_REMOVAL.sql)**

That's it! The Vercel deployment will work.
