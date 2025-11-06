# Clear Test Data Instructions

## Quick Start

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
   - Or navigate to: Project → SQL Editor

2. **Run the cleanup script**
   - Copy the contents of `supabase/scripts/clear-test-data.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl/Cmd + Enter`

3. **Verify cleanup**
   - Check the output at the bottom of the script
   - Should show 0 users, orders, products, etc.
   - Should show preserved categories, vehicle classes, settings

## What Gets Deleted

✅ **All User Data**
- auth.users (all test accounts)
- profiles
- supplier_profiles

✅ **All Business Data**
- products
- orders & order_items
- deliveries
- payments
- disputes
- notifications
- communications
- wallet transactions

## What Gets Preserved

✅ **Configuration Data**
- categories (seed data)
- vehicle_classes (وانيت, شاحنة, قلاب)
- settings (thresholds, commission rates)

## After Cleanup

You can now:
1. **Register fresh test accounts**
   - Suppliers with email verification
   - Contractors with email verification

2. **Test the new color theme**
   - Electric Teal buttons
   - Lime Pulse verification badges
   - Sand Beige backgrounds

3. **Test email verification flow**
   - Contractors blocked from ordering until verified
   - Warning banners display correctly
   - Resend email functionality works

## Quick Test Plan

### 1. Supplier Flow
```
1. Register supplier account (email + password)
2. Check email for verification link
3. Click verification link
4. Login to supplier portal
5. Create products
6. Configure zone fees
```

### 2. Contractor Flow
```
1. Register contractor account (email + password)
2. Check email for verification link
3. Browse products (should work without verification)
4. Add items to cart
5. Try to checkout WITHOUT verifying email
   → Should see warning banner
   → Should be blocked from submitting order
6. Click verification link in email
7. Return to checkout
8. Submit order successfully ✅
```

### 3. Visual QA - New Colors
```
✅ Background is Sand Beige (#F5F0E6)
✅ Primary buttons are Electric Teal (#1DE9B6)
✅ Email verified badge is Lime (#C6FF00)
✅ Text is Deep Navy (#0D1B2A)
✅ Borders are Concrete Gray (#ECEFF1)
```

## Troubleshooting

### If you get foreign key constraint errors:
- The script should handle this automatically with `CASCADE`
- If issues persist, run the script section by section

### If auth.users doesn't clear:
- You may need admin privileges
- Alternative: Delete users manually via Supabase Dashboard → Authentication → Users

### To preserve specific test users:
- Comment out the `DELETE FROM auth.users` line
- Manually delete unwanted users via dashboard

## Safety Notes

⚠️ **WARNING**: This operation is IRREVERSIBLE
⚠️ Only use in development/testing environments
⚠️ Never run in production without a backup

## Alternative: Selective Cleanup

If you want to keep some data, edit the script and comment out specific TRUNCATE statements:

```sql
-- Keep products by commenting out:
-- TRUNCATE TABLE products CASCADE;

-- Keep specific users (delete others manually via dashboard)
-- Comment out: DELETE FROM auth.users;
```
