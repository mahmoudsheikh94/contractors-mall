# Phase 2 Quickstart Guide

## 🚀 How to Test What's Been Built

### Step 1: Apply RLS Policy Fix (CRITICAL)

**This must be done first** to fix the missing RLS policies:

1. Open Supabase Studio: http://localhost:54323
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open `supabase/migrations/20250126_add_missing_rls_policies.sql` in your editor
5. Copy ALL the contents
6. Paste into Supabase SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see a success message showing:
   - categories: 2 policies
   - vehicles: 2 policies
   - supplier_zone_fees: 3 policies

**Why this is needed**: The initial schema enabled RLS but didn't create SELECT policies for these lookup tables, making them unreadable and causing errors.

### Step 2: Load Seed Data

After fixing RLS policies, load the test data:

1. In the same **SQL Editor** in Supabase Studio
2. Click **New Query**
3. Open `supabase/seed-dev.sql` in your editor
4. Copy ALL the contents
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see success messages indicating:
   - 3 Vehicles created
   - 4 Settings groups created
   - 17 Categories created
   - 3 Suppliers created
   - 20+ Products created

### Step 3: Start the Development Server

```bash
# From project root
pnpm dev
```

This will start:
- Web app: http://localhost:3000
- Supabase: http://localhost:54321
- Supabase Studio: http://localhost:54323

### Step 4: Login as Contractor

1. Go to http://localhost:3000/auth/login
2. Use your existing test contractor account
3. You should land on `/dashboard`

**Note**: The seed file also creates 3 supplier accounts you can test with:
- `ahmad@almawad.jo` / `TestPassword123!`
- `mohammad@bina.jo` / `TestPassword123!`
- `khaled@tijara.jo` / `TestPassword123!`

These will redirect to `/supplier/dashboard` (to be implemented)

### Step 5: Browse Suppliers

From dashboard, you can:
- Click **"عرض الخريطة"** → Navigate to `/map` (coming soon)
- Or manually go to: http://localhost:3000/suppliers

**What to test**:
- ✅ You see 3 suppliers listed
- ✅ Search for "المواد" - should show supplier 1
- ✅ Browser asks for location permission:
  - **Allow**: See distances calculated, zones displayed, sorted by proximity
  - **Block**: Still see suppliers, just without distance info
- ✅ Each card shows:
  - Business name (Arabic + English)
  - Rating (stars + count)
  - Address
  - Distance (if location shared)
  - Zone badge (منطقة أ / منطقة ب)
  - Delivery fees per vehicle type
  - Phone number
- ✅ Click **"عرض المنتجات"** on any supplier

### Step 6: Browse Products

Go to: http://localhost:3000/products

**What to test**:
- ✅ You see 20+ products from all suppliers
- ✅ Sidebar shows categories hierarchy:
  - Main categories (bold)
  - Sub-categories (indented)
- ✅ Click a category → filters products
- ✅ Click subcategory → filters further
- ✅ Search "أسمنت" → shows only cement products
- ✅ Search "sand" → shows English matches too
- ✅ Each product card shows:
  - Name (Arabic + English)
  - Category badge
  - Description (if available)
  - Supplier name + rating
  - Weight/Volume specs
  - Price per unit
  - Min order quantity
  - "أضف للسلة" button (not functional yet)

**Filter by supplier**:
- From suppliers page, click "عرض المنتجات" on supplier 1
- URL should be: `/products?supplierId=d1111111-1111-1111-1111-111111111111`
- You see ONLY products from that supplier

### Step 7: Verify Data Integrity

**Check in Supabase Studio** (http://localhost:54323):

Go to **Table Editor**:

1. **vehicles** table:
   - Should have 3 rows
   - Check: وانيت 1 طن, شاحنة 3.5 طن, قلاب مسطح 5 طن

2. **categories** table:
   - Should have 17 rows
   - Check hierarchy: parent_id is NULL for main categories

3. **suppliers** table:
   - Should have 3 rows
   - All should have `is_verified = true`
   - Check: rating_average, latitude, longitude are populated

4. **supplier_zone_fees** table:
   - Should have 18 rows (3 suppliers × 2 zones × 3 vehicles)
   - Verify fees make sense (zone_b > zone_a)

5. **products** table:
   - Should have 20+ rows
   - All should have `is_available = true`
   - Check: weight_kg_per_unit, price_per_unit are populated

6. **settings** table:
   - Should have 4 rows with keys:
     - delivery_settings
     - commission_settings
     - dispute_settings
     - platform_settings

## 🐛 Troubleshooting

### "No suppliers found"
- **Check**: Did you run the seed SQL?
- **Check**: Go to Supabase Studio → suppliers table → verify `is_verified = true`
- **Check**: Browser console for API errors

### "No products found"
- **Check**: Products table has data
- **Check**: Products have `is_available = true`
- **Check**: Suppliers have `is_verified = true` (products join on suppliers)

### Location permission denied
- **Expected behavior**: Suppliers still load, just without distance calculation
- To reset permission: Browser settings → Site settings → Reset permissions

### Arabic text not displaying correctly
- **Check**: Browser DevTools → Elements → `<div dir="rtl">` is present
- **Check**: Text alignment is right-to-left
- **Should see**: Arabic on the right, numbers on the left

### API returns 500 error
- **Check**: Supabase is running (http://localhost:54321)
- **Check**: Environment variables in `apps/web/.env.local`
- **Check**: Browser console + terminal logs for details

## 🔍 What to Look For (Quality Check)

### UI/UX
- [ ] All text is right-aligned
- [ ] Cards have consistent spacing
- [ ] Hover effects work smoothly
- [ ] Loading states show spinner
- [ ] Empty states show helpful message
- [ ] Search is responsive (works as you type)

### Data Display
- [ ] Prices show with 2 decimal places
- [ ] Arabic numerals used throughout
- [ ] Ratings show 1 decimal place
- [ ] Distances show 1 decimal place
- [ ] Zone badges have correct colors:
  - منطقة أ = Green
  - منطقة ب = Yellow
  - خارج النطاق = Red

### Functionality
- [ ] Search filters immediately
- [ ] Category selection updates product list
- [ ] Clicking supplier card → goes to products page
- [ ] Back navigation works
- [ ] URLs are shareable (contain state in query params)

## 📱 Mobile Testing

1. Open DevTools → Toggle device toolbar (Cmd+Shift+M)
2. Select iPhone or Android device
3. Test:
   - [ ] Sidebar is scrollable
   - [ ] Cards stack in single column
   - [ ] Touch targets are large enough
   - [ ] Search bar is full width

## 🎯 Demo Flow (For Presentation)

1. **Start at Dashboard**
   - "مرحباً بك في مول المقاول"
   - Show 3 action cards

2. **Browse Suppliers**
   - Click "عرض الخريطة" (or go to /suppliers)
   - Allow location → See distance-sorted suppliers
   - Point out zone badges and delivery fees
   - Click on "شركة الموّاد الأردنية"

3. **View Supplier Products**
   - Now filtered to 1 supplier
   - Show variety of products (cement, steel, sand, blocks)
   - Click "جميع المنتجات" to see all

4. **Filter by Category**
   - Click "أسمنت" in sidebar
   - Show only cement products
   - Click subcategory "حديد" → show steel products

5. **Search**
   - Type "رمل" → instant results
   - Type "sand" → English search works too

6. **Ready for Cart**
   - Point to "أضف للسلة" buttons
   - "Next step: implement shopping cart!"

---

**Last Updated**: Phase 2 - Ready for Testing
**Next**: Implement cart, vehicle estimation, and checkout
