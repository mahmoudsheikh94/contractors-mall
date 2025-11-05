# Migration Fix Summary

## Issue Found

The original migration file (`20251105_phase_2c_order_enhancements.sql`) had **incorrect foreign key references**.

### Problem
The migration was referencing `orders(order_id)` but the actual primary key column in the orders table is `orders(id)`.

### Error Message
```
Error: Failed to run sql query: ERROR: 42703: column "order_id" referenced in foreign key constraint does not exist
```

---

## Files Created

### 1. **CURRENT_SCHEMA.sql**
- Complete reference of the existing Supabase database schema
- Includes all tables with their correct column names
- Documented with important notes about column naming conventions
- **Location**: `/supabase/CURRENT_SCHEMA.sql`
- **Purpose**: Reference for future development to avoid similar issues

### 2. **20251105_phase_2c_order_enhancements_FIXED.sql**
- Corrected version of the migration file
- All foreign keys now correctly reference `orders(id)` instead of `orders(order_id)`
- **Location**: `/supabase/migrations/20251105_phase_2c_order_enhancements_FIXED.sql`

---

## Key Changes in Fixed Migration

### Foreign Key Corrections

**Before (❌ Incorrect)**:
```sql
order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE
```

**After (✅ Correct)**:
```sql
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
```

### Tables Affected:
1. **order_activities** - Line 25
2. **order_notes** - Line 45
3. **order_tag_assignments** - Line 83

### RLS Policy Corrections

**Before (❌ Incorrect)**:
```sql
WHERE orders.order_id = order_activities.order_id
```

**After (✅ Correct)**:
```sql
WHERE orders.id = order_activities.order_id
```

### Additional Changes:
1. **order_tags table**: Changed from `name_ar`/`name_en` to single `name` column (to match API implementation)
2. **order_tag_assignments**: Added `id` as primary key and `assigned_by` column for better tracking
3. **customer_order_stats view**: Changed `o.order_id` to `o.id`

---

## How to Apply the Fixed Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"

# Apply the fixed migration
supabase db push

# Or apply manually
supabase db execute --file supabase/migrations/20251105_phase_2c_order_enhancements_FIXED.sql
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `20251105_phase_2c_order_enhancements_FIXED.sql`
4. Paste and run the SQL

### Option 3: Delete Old Migration and Use Fixed Version

```bash
# Remove the broken migration file
rm supabase/migrations/20251105_phase_2c_order_enhancements.sql

# Rename fixed version
mv supabase/migrations/20251105_phase_2c_order_enhancements_FIXED.sql \
   supabase/migrations/20251105_phase_2c_order_enhancements.sql

# Apply migration
supabase db push
```

---

## Verification Steps

After running the migration, verify it was successful:

### 1. Check Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('order_activities', 'order_notes', 'order_tags', 'order_tag_assignments');
```

### 2. Check Foreign Keys
```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('order_activities', 'order_notes', 'order_tag_assignments');
```

### 3. Check RLS Policies
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('order_activities', 'order_notes', 'order_tags', 'order_tag_assignments');
```

### 4. Test a Simple Insert (Optional)
```sql
-- This should work without errors if migration is successful
-- Replace UUIDs with actual values from your database
INSERT INTO order_activities (order_id, activity_type, description)
VALUES ('[your-order-id]', 'test', 'Migration test');

-- Clean up test data
DELETE FROM order_activities WHERE activity_type = 'test';
```

---

## Important Schema Notes

### Orders Table Primary Key
- **Primary Key Column**: `id` (UUID)
- **Display Column**: `order_number` (TEXT, UNIQUE)
- **All foreign keys must reference**: `orders(id)`

### Other Tables with Non-Standard PKs
- `deliveries` - Uses `delivery_id` as PK (but has `order_id` FK to orders.id)
- `order_items` - Uses `item_id` as PK
- `suppliers` - Uses `id` as PK (standard)

---

## Prevention for Future Migrations

1. **Always reference** `/supabase/CURRENT_SCHEMA.sql` before writing new migrations
2. **Double-check** foreign key references match the actual column names
3. **Test migrations** on a development database first
4. **Use qualified names** when ambiguous (e.g., `orders.id` instead of just `order_id`)

---

## Summary

✅ **Schema reference file created** (`CURRENT_SCHEMA.sql`)
✅ **Fixed migration file created** (`20251105_phase_2c_order_enhancements_FIXED.sql`)
✅ **All foreign keys corrected** to reference `orders(id)`
✅ **RLS policies updated** with correct column references
✅ **Ready to apply** - Choose one of the three options above

---

**Date Fixed**: November 5, 2025
**Fixed By**: Claude Code
**Issue**: Foreign key constraint references non-existent column
**Resolution**: Updated all references from `orders(order_id)` to `orders(id)`
