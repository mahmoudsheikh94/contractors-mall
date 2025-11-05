# 🎯 Apply Database Setup - 2 Minutes

Your environment files are ready! Now let's set up your database.

## Step 1: Open SQL Editor in Supabase

1. Go to your Supabase project: **https://zbscashhrdeofvgjnbsb.supabase.co**
2. Click **"SQL Editor"** in the left sidebar (icon looks like `</>`)
3. Click **"New query"** button

## Step 2: Copy the Setup Script

Open the file:
```
supabase/combined-setup.sql
```

**Select ALL the content** (Cmd+A) and **copy it** (Cmd+C)

## Step 3: Paste and Run

1. In the SQL Editor, **paste** the entire script (Cmd+V)
2. Click the **"Run"** button (or press Cmd+Enter)
3. Wait ~5-10 seconds...
4. You should see: **"Success. No rows returned"**

## Step 4: Verify Setup ✅

### Check Tables
1. Click **"Table Editor"** in the left sidebar
2. You should see **16 tables**:
   - ✅ profiles
   - ✅ suppliers
   - ✅ vehicles (should have 3 rows!)
   - ✅ products
   - ✅ orders
   - ✅ deliveries
   - ✅ payments
   - ✅ disputes
   - ✅ categories (should have 7 rows!)
   - ✅ settings (should have 4 rows!)
   - ... and 6 more

### Check Vehicles Data
1. Click on **"vehicles"** table
2. You should see 3 rows:
   - وانيت 1 طن (Pickup 1 Ton)
   - شاحنة 3.5 طن (Truck 3.5 Ton)
   - قلاب مسطح 5 طن (Flatbed 5 Ton)

### Check Settings Data
1. Click on **"settings"** table
2. You should see 4 rows:
   - delivery_settings
   - commission_settings
   - dispute_settings
   - platform_settings

### Check Categories Data
1. Click on **"categories"** table
2. You should see 7 rows including:
   - مواد بناء عامة
   - كهربائيات وإنارة
   - أسمنت
   - حديد
   - etc.

## Step 5: Check Storage Buckets

1. Click **"Storage"** in the left sidebar
2. You should see 3 buckets:
   - ✅ product_media (public)
   - ✅ delivery_proofs (private)
   - ✅ dispute_media (private)

## Step 6: Test a Function (Optional)

Go back to **SQL Editor** and run this test:

```sql
SELECT * FROM fn_visible_suppliers(
  31.9539,  -- Amman latitude
  35.9106,  -- Amman longitude
  NULL      -- no category filter
);
```

**Expected result:** Empty array `[]` (no suppliers yet - that's correct!)

---

## ✅ If Everything Looks Good:

**Your database is ready!** 🎉

Now run:
```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
pnpm install
pnpm dev
```

Then open:
- Contractor app: http://localhost:3000
- Admin app: http://localhost:3001

---

## 🐛 If Something Went Wrong:

### "Error: relation already exists"
This means you ran the script twice. To fix:
1. Go to **SQL Editor**
2. Run this to reset:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
3. Then run the combined-setup.sql again

### "Error: extension postgis does not exist"
PostGIS should be enabled by default. If not:
1. Go to **Database** → **Extensions**
2. Enable **postgis**
3. Run the script again

### "Success but no tables visible"
1. Refresh the page
2. Check **Table Editor** again
3. Make sure you're in the correct project

---

**Ready? Go apply the SQL script now!** Once done, tell me what you see in Table Editor and we'll verify everything together! 🚀