# Database Migration Fix Instructions

**Created**: October 30, 2025
**Purpose**: Fix missing tables and apply Phase 4 updates

---

## Problem Summary

The database was missing core tables (`orders`, `deliveries`, `payments`) that are required for the application to work. The Phase 4 migration failed because it tried to ALTER tables that didn't exist.

---

## Solution Files Created

1. **`20251030_create_core_tables.sql`** - Creates all missing core tables
2. **`20251030_phase4_delivery_confirmation.sql`** (Updated) - Fixed constraint name and added safety checks

---

## How to Apply the Migrations

### Method 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"

# Apply all migrations
pnpm supabase db push

# Or apply specific migrations
pnpm supabase db push --include-all
```

### Method 2: Manual SQL Execution in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run migrations in this order:

#### Step 1: Run Core Tables Migration
```sql
-- Copy and paste the entire content of:
-- supabase/migrations/20251030_create_core_tables.sql
```

#### Step 2: Run Phase 4 Migration
```sql
-- Copy and paste the entire content of:
-- supabase/migrations/20251030_phase4_delivery_confirmation.sql
```

### Method 3: Using psql Command Line

```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
\i supabase/migrations/20251030_create_core_tables.sql
\i supabase/migrations/20251030_phase4_delivery_confirmation.sql
```

---

## Verification Steps

After applying the migrations, verify everything is working:

### 1. Check Tables Exist
Run this query in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('orders', 'order_items', 'deliveries', 'payments', 'payment_events')
ORDER BY table_name;
```

Expected result: Should return all 5 tables.

### 2. Check Columns Added
```sql
-- Check deliveries table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deliveries'
AND column_name IN ('photo_url', 'photo_uploaded_at', 'pin_attempts', 'pin_verified_at')
ORDER BY column_name;
```

Expected result: Should return all 4 columns.

### 3. Check Constraints Created
```sql
-- Check constraints exist
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'deliveries'
AND constraint_type = 'CHECK';
```

Expected result: Should include `chk_pin_attempts_max` and `chk_delivery_confirm_method`.

---

## Storage Bucket Setup

The delivery photos feature requires a Supabase Storage bucket. Create it manually:

1. Go to Supabase Dashboard → Storage
2. Click "New Bucket"
3. Configure:
   - **Name**: `deliveries`
   - **Public**: Yes (so contractors can view proof photos)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`

---

## Test the Application

After migrations are applied:

1. **Test Order Creation**:
   ```bash
   # The app should now be able to create orders
   # Visit: http://localhost:3000
   # Add items to cart and complete checkout
   ```

2. **Test Order Viewing**:
   ```bash
   # Visit: http://localhost:3000/orders
   # Should display orders list without errors
   ```

3. **Test Order Details**:
   ```bash
   # Click on any order to view details
   # Should display PIN for orders >= 120 JOD
   ```

---

## Troubleshooting

### If you get "table already exists" errors:
The migrations are designed to be idempotent (safe to run multiple times). Just continue.

### If you get permission errors:
Make sure you're using the correct database credentials with proper permissions.

### If the app still shows errors after migration:
1. Clear browser cache
2. Restart the development server:
   ```bash
   # Stop the server (Ctrl+C)
   # Start again
   pnpm dev
   ```

### To completely reset and start fresh:
```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Then run the migrations again
```

---

## Migration Files Reference

### Core Tables Created:
- `orders` - Main orders table with all fields
- `order_items` - Line items for each order
- `deliveries` - Delivery tracking and confirmation
- `payments` - Payment escrow tracking
- `payment_events` - Audit trail for payments

### Phase 4 Fields Added:
- `deliveries.photo_url` - Photo proof URL
- `deliveries.photo_uploaded_at` - Photo upload timestamp
- `deliveries.pin_attempts` - PIN attempt counter
- `deliveries.pin_verified_at` - PIN verification timestamp
- `orders.disputed_at` - Dispute timestamp
- `orders.dispute_reason` - Dispute description

---

## Next Steps

Once migrations are applied successfully:
1. ✅ Create a test order to verify everything works
2. ✅ Test PIN verification for orders >= 120 JOD
3. ✅ Test photo upload for orders < 120 JOD
4. ✅ Test dispute reporting

The application should now work correctly with all Phase 4 features!