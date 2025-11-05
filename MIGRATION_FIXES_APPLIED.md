# Migration Fixes Applied - Order Management Compatibility

**Date**: October 30, 2025
**File**: `supabase/migrations/20251030_create_core_tables.sql`
**Status**: ✅ Fixed and Ready to Run

---

## Summary

Updated the core tables migration to match the Order Management UI built in Phase 5B. The migration is now fully compatible with the supplier portal features.

---

## Changes Applied

### 1. ✅ Added Missing Columns to `orders` Table

**Line 36**: Added `vehicle_type TEXT NOT NULL`
- Stores the auto-selected vehicle type (pickup_1ton, truck_3_5ton, flatbed_5ton)
- Required by order details page display

**Line 57**: Added `rejection_reason TEXT`
- Stores supplier's reason when rejecting an order
- Used by OrderActions.tsx component

**Line 60**: Changed `notes` to `delivery_notes`
- More specific field name for delivery-specific instructions
- Matches UI expectations

### 2. ✅ Fixed `order_items` Table Column Names

**Line 76**: Changed `order_item_id` → `item_id`
- Matches UI query expectations
- JOIN queries now work correctly

**Line 84**: Changed `subtotal_jod` → `total_jod`
- Consistent naming with UI
- Order items now display correctly

### 3. ✅ Added CRITICAL Supplier RLS Policies

Without these policies, suppliers would get "permission denied" errors when accessing their orders.

**Lines 257-259**: Suppliers can view their orders
```sql
CREATE POLICY "Suppliers can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (supplier_id = auth.uid());
```

**Lines 263-267**: Suppliers can update their orders (accept/reject)
```sql
CREATE POLICY "Suppliers can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());
```

**Lines 282-290**: Suppliers can view deliveries
```sql
CREATE POLICY "Suppliers can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = deliveries.order_id
      AND orders.supplier_id = auth.uid()
    )
  );
```

**Lines 306-314**: Suppliers can view payments
```sql
CREATE POLICY "Suppliers can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = payments.order_id
      AND orders.supplier_id = auth.uid()
    )
  );
```

### 4. ✅ Updated DROP POLICY Statements

Added DROP statements for all new supplier policies (lines 235-240) to ensure idempotent migration.

### 5. ✅ Added Documentation Comments

**Lines 206-208**: Added column comments
```sql
COMMENT ON COLUMN orders.rejection_reason IS 'Supplier reason for rejecting order';
COMMENT ON COLUMN orders.vehicle_type IS 'Auto-selected vehicle type for delivery';
COMMENT ON COLUMN orders.delivery_notes IS 'Special delivery instructions from contractor';
```

---

## Impact

### Before Fixes:
- ❌ Supplier portal would fail with "permission denied" errors
- ❌ Order items wouldn't load (column name mismatch)
- ❌ Vehicle type and rejection reason wouldn't display
- ❌ Accept/reject functionality would save to non-existent columns

### After Fixes:
- ✅ Suppliers can view and update their orders
- ✅ Order items load correctly
- ✅ All UI fields have corresponding database columns
- ✅ Accept/reject workflow works properly
- ✅ RLS policies properly secure access for both contractors and suppliers

---

## How to Apply This Migration

### Option 1: Supabase Dashboard (Recommended for first-time setup)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy** entire contents of `supabase/migrations/20251030_create_core_tables.sql`
3. **Paste** into SQL Editor
4. **Click "Run"**
5. **Verify** success message appears

### Option 2: Supabase CLI (for existing projects)

```bash
# Navigate to project root
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"

# Run migration
npx supabase db push
```

### Option 3: Manual SQL (if tables already exist)

If you've already run the old migration, you need to add the missing columns:

```sql
-- Add missing columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Rename order_items columns
ALTER TABLE order_items RENAME COLUMN order_item_id TO item_id;
ALTER TABLE order_items RENAME COLUMN subtotal_jod TO total_jod;

-- Then run the supplier RLS policies from the migration file (lines 257-314)
```

---

## Verification Queries

After running the migration, verify everything is set up correctly:

```sql
-- 1. Check orders table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('vehicle_type', 'rejection_reason', 'delivery_notes');

-- Expected: 3 rows returned

-- 2. Check order_items has correct column names
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('item_id', 'total_jod');

-- Expected: 2 rows returned (item_id, total_jod)

-- 3. Check supplier RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE policyname LIKE '%Suppliers%'
ORDER BY tablename, policyname;

-- Expected: 4 policies
-- - Suppliers can view their orders (orders)
-- - Suppliers can update their orders (orders)
-- - Suppliers can view deliveries (deliveries)
-- - Suppliers can view payments (payments)
```

---

## Testing the Supplier Portal

After applying the migration:

1. **Start the admin app**:
   ```bash
   cd apps/admin
   pnpm dev
   ```
   Open: http://localhost:3001

2. **Register a supplier**:
   - Go to http://localhost:3001/auth/register
   - Fill in the form
   - Complete registration

3. **Verify supplier in database**:
   ```sql
   SELECT s.business_name, s.is_verified, p.email, p.role
   FROM suppliers s
   JOIN profiles p ON s.owner_id = p.id
   WHERE p.email = 'your-test-email@example.com';
   ```

4. **Manually verify the supplier**:
   ```sql
   UPDATE suppliers
   SET is_verified = true, verified_at = NOW()
   WHERE owner_id = (SELECT id FROM profiles WHERE email = 'your-test-email@example.com');
   ```

5. **Test login**:
   - Go to http://localhost:3001/auth/login
   - Login with registered credentials
   - Should redirect to `/supplier/dashboard`

6. **Test order management**:
   - Navigate to `/supplier/orders`
   - Should see orders list (or empty state)
   - No "permission denied" errors
   - Accept/reject actions work properly

---

## Related Documentation

- **Order Management UI**: `apps/admin/src/app/supplier/orders/`
- **Database Setup Guide**: `DATABASE_SETUP_GUIDE.md`
- **Phase 5 Progress**: `PHASE5_SUPPLIER_PORTAL_PROGRESS.md`
- **Troubleshooting**: `supabase/scripts/troubleshooting_queries.sql`

---

## File Location

**Migration File**: `supabase/migrations/20251030_create_core_tables.sql`

All changes are **idempotent** - safe to run multiple times without errors.

---

**Status**: ✅ Ready for deployment
