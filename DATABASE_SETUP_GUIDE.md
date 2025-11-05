# Database Setup Guide - Contractors Mall Admin Portal

**Last Updated**: October 30, 2025
**Purpose**: Guide to properly set up your Supabase database for the Supplier Admin Portal

---

## 🎯 Overview

This guide helps you set up the database schema in the **CORRECT** Supabase project after accidentally running migrations in the wrong project.

---

## ⚠️ Common Mistake: Wrong Project

**What Happened:**
- You pasted SQL migrations into a different Supabase project
- That project had an older schema, causing the `scheduled_date` error
- The error occurred because the old `deliveries` table structure was different

**The Fix:**
- **Ignore the wrong project** - don't try to fix it
- Focus on your **correct project** for the Admin Portal
- Follow the steps below to ensure proper schema

---

## 📋 Step-by-Step Setup

### Step 1: Verify You're in the Correct Project

1. Open https://supabase.com/dashboard
2. Select your **Contractors Mall** project (the one you want to use)
3. Note the project reference ID in the URL: `https://supabase.com/dashboard/project/YOUR-PROJECT-ID`
4. Double-check this is the project your app is connected to by checking `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
   ```

### Step 2: Check What Tables Already Exist

**In Supabase Dashboard → SQL Editor**, run:

```sql
-- Check existing tables
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected Tables for Admin Portal:**
- `profiles` - User accounts with roles
- `suppliers` - Supplier businesses
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `deliveries` - Delivery tracking
- `payments` - Payment and escrow tracking
- `payment_events` - Payment audit trail

### Step 3: Apply Migrations in Correct Order

#### Option A: Fresh Start (No Tables Exist)

If the query above returns empty or very few tables:

1. **Run Initial Schema** (creates base structure):
   - Open `supabase/migrations/20241023000001_initial_schema.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

2. **Run Core Tables Migration** (ensures all core tables exist):
   - Open `supabase/migrations/20251030_create_core_tables.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

3. **Run Phase 4 Updates** (adds delivery confirmation fields):
   - Open `supabase/migrations/20251030_phase4_delivery_confirmation.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

#### Option B: Tables Already Exist (From Initial Schema)

If tables exist but you're missing some:

1. **Run Core Tables Migration** (idempotent - safe to run):
   ```
   supabase/migrations/20251030_create_core_tables.sql
   ```
   This will create any missing tables without affecting existing ones.

2. **Run Phase 4 Updates** (adds new columns):
   ```
   supabase/migrations/20251030_phase4_delivery_confirmation.sql
   ```
   This adds delivery confirmation fields to existing tables.

### Step 4: Verify Schema is Correct

Run this verification query:

```sql
-- Verify critical columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('deliveries', 'orders', 'suppliers', 'profiles', 'payments')
  AND column_name IN (
    'scheduled_date',    -- deliveries (Phase 4)
    'photo_url',         -- deliveries (Phase 4)
    'pin_verified_at',   -- deliveries (Phase 4)
    'disputed_at',       -- orders (Phase 4)
    'is_verified',       -- suppliers (Phase 5A)
    'role',              -- profiles (base)
    'status'             -- payments (base)
  )
ORDER BY table_name, column_name;
```

**Expected Result:** Should return all listed columns. If any are missing, check which migration failed.

### Step 5: Check Required Enums

```sql
-- Verify enums exist
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'order_status', 'payment_status')
ORDER BY t.typname, e.enumsortorder;
```

**Expected Enums:**
- `user_role`: contractor, supplier_admin, driver, admin
- `order_status`: pending, confirmed, accepted, in_delivery, delivered, completed, cancelled, rejected, disputed
- `payment_status`: pending, escrow_held, released, refunded, failed, frozen

### Step 6: Create Test Supplier Account

**IMPORTANT**: Use the registration page we built!

Go to: http://localhost:3001/auth/register

Fill in the form to create a supplier account. After registration:

1. **Verify the account in database**:
   ```sql
   -- Find newly created supplier
   SELECT
     s.id,
     s.business_name,
     s.is_verified,
     p.email,
     p.role
   FROM suppliers s
   JOIN profiles p ON s.owner_id = p.id
   WHERE p.email = 'your-test-email@example.com';
   ```

2. **Manually verify the supplier** (since we haven't built admin approval yet):
   ```sql
   -- Verify the supplier so they can log in
   UPDATE suppliers
   SET is_verified = true,
       verified_at = NOW()
   WHERE owner_id = (
     SELECT id FROM profiles WHERE email = 'your-test-email@example.com'
   );
   ```

3. **Test login**: Go to http://localhost:3001/auth/login

---

## 🧪 Testing the Setup

### Test 1: Login as Supplier

1. Go to http://localhost:3001/auth/login
2. Use the email/password from registration
3. Should redirect to `/supplier/dashboard`
4. Dashboard should load without errors

### Test 2: Dashboard Displays Correctly

The dashboard queries these tables:
- ✅ `orders` - for order counts
- ✅ `products` - for active products count
- ✅ `deliveries` - for today's deliveries
- ✅ `payments` - for total earnings

If any queries fail, check that those tables exist.

### Test 3: Check for Query Errors

Open browser console (F12) and check for:
- ❌ "relation does not exist" errors
- ❌ "column does not exist" errors

If you see these, the schema is incomplete.

---

## 🐛 Troubleshooting

### Error: "type 'user_role' already exists" OR "relation 'profiles' already exists"

**Cause**: You've already run part of the migration before. Some objects were created but the rest failed.

**Solution**: Already fixed! The migration is now **fully idempotent** (safe to run multiple times):
- ✅ All enums check `IF NOT EXISTS`
- ✅ All tables use `CREATE TABLE IF NOT EXISTS`
- ✅ All indexes use `CREATE INDEX IF NOT EXISTS`

Just re-run the updated `initial_schema.sql` - it will skip existing objects and create any missing ones.

### Error: "syntax error at or near 'SPATIAL'"

**Cause**: Line 79 in `initial_schema.sql` had wrong syntax (MySQL instead of PostgreSQL)

**Solution**: Already fixed! The file now has the correct syntax:
```sql
CREATE INDEX idx_suppliers_location ON suppliers USING GIST(location);
```

If you see this error, just re-copy the updated `initial_schema.sql` file and run it again.

### Error: "relation 'deliveries' does not exist"

**Solution**: Run `20251030_create_core_tables.sql` migration

### Error: "column 'scheduled_date' does not exist"

**Solution**: The deliveries table exists but is outdated. Run:
```sql
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_date DATE;
```

### Error: "column 'is_verified' does not exist in suppliers"

**Solution**: Run the initial schema migration that creates proper suppliers table

### Error: "role 'supplier_admin' does not exist in enum"

**Solution**: The `user_role` enum is missing. Run initial schema migration.

### Login Shows "Account Under Review" Even Though is_verified = true

**Cause**: The layout.tsx checks `is_verified` from suppliers table

**Solution**: Verify the supplier record:
```sql
SELECT
  s.business_name,
  s.is_verified,
  p.email,
  p.role
FROM suppliers s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'your-email@example.com';
```

If `is_verified` is `false`, run the UPDATE query from Step 6 above.

---

## 📊 Schema Status Check

Run this comprehensive check:

```sql
-- Full schema health check
WITH table_check AS (
  SELECT 'profiles' as table_name, COUNT(*) > 0 as exists
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
  UNION ALL
  SELECT 'suppliers', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'suppliers'
  UNION ALL
  SELECT 'orders', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'orders'
  UNION ALL
  SELECT 'deliveries', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'deliveries'
  UNION ALL
  SELECT 'payments', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'payments'
  UNION ALL
  SELECT 'products', COUNT(*) > 0
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'products'
)
SELECT
  table_name,
  CASE WHEN exists THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM table_check;
```

**Expected Output**: All tables should show ✅ EXISTS

---

## 🎯 Quick Reference

### Migration Files Order:
1. `20241023000001_initial_schema.sql` - Base structure
2. `20251030_create_core_tables.sql` - Core tables (idempotent)
3. `20251030_phase4_delivery_confirmation.sql` - Phase 4 features

### Critical Columns for Admin Portal:
- `profiles.role` - Must include 'supplier_admin'
- `suppliers.is_verified` - Must be true for login
- `orders.status` - For dashboard stats
- `products.is_available` - For active products count
- `deliveries.scheduled_date` - For today's deliveries
- `payments.status` - For earnings calculation

### Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## ✅ Success Criteria

You're done when:
- ✅ All tables exist in correct project
- ✅ Can register new supplier via `/auth/register`
- ✅ Can verify supplier in database
- ✅ Can log in as verified supplier
- ✅ Dashboard loads with stats (even if all zeros)
- ✅ No console errors about missing tables/columns

---

## 📞 Need Help?

If you're still stuck:
1. Run the "Schema Status Check" query above
2. Check which tables/columns are missing
3. Identify which migration file creates them
4. Re-run that specific migration

---

**Remember**: The wrong Supabase project can be ignored. Focus on getting your **correct** project set up properly!
