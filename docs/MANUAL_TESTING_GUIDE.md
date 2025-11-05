# Manual Testing Guide - Contractors Mall MVP

## 📋 Overview

This guide provides step-by-step manual test scenarios for the Contractors Mall platform. Use this document to systematically test all features before releases.

**Version**: Phase 3 - Checkout & Orders Complete
**Last Updated**: 2025-01-28

---

## 🎯 Test Environment Setup

### Prerequisites
- Dev server running: `pnpm dev` at `http://localhost:3000`
- Supabase local instance running
- Test database seeded with sample data
- Browser with geolocation permissions enabled
- Clear browser storage before starting tests

### Test User Accounts

Create these test accounts or use existing ones from seed data:

1. **Contractor 1** (Test basic flow)
   - Phone: `0791234567`
   - OTP: Use any code (mock mode)

2. **Contractor 2** (Test multi-user scenarios)
   - Phone: `0797654321`
   - OTP: Use any code (mock mode)

### Test Data Setup

Ensure database has:
- ✅ At least 3 suppliers in different zones
- ✅ At least 20 products across categories
- ✅ Vehicle types configured (وانيت 1 طن, شاحنة 3.5 طن, قلاب مسطح 5 طن)
- ✅ Settings configured (thresholds, safety margin)

---

## 🧪 Test Scenarios

### **Test Suite 1: Authentication & Profile**

#### **TS1.1: New User Registration**

**Steps:**
1. Navigate to `/`
2. Click "تسجيل الدخول" (Login)
3. Enter phone number: `0791234567`
4. Click "إرسال رمز التحقق"
5. Enter any 6-digit OTP code
6. Complete profile:
   - Full Name (Arabic): `أحمد المقاول`
   - Full Name (English): `Ahmad Contractor`
   - Business Name: `شركة البناء الحديثة`
7. Submit

**Expected Results:**
- ✅ Phone number validated (10 digits, starts with 079)
- ✅ OTP screen shown
- ✅ Profile creation form appears for new users
- ✅ Redirected to dashboard after profile creation
- ✅ User name displayed in header

**Test Data:**
- Valid phone: `0791234567`
- Invalid phone: `123` (should show error)

---

#### **TS1.2: Existing User Login**

**Steps:**
1. Navigate to `/`
2. Click "تسجيل الدخول"
3. Enter existing user phone: `0791234567`
4. Enter OTP
5. Verify auto-redirect to dashboard

**Expected Results:**
- ✅ No profile creation form shown
- ✅ Direct redirect to `/dashboard`
- ✅ Session persists across page refreshes

---

#### **TS1.3: Protected Route Access**

**Steps:**
1. Open incognito/private window
2. Try to access `/products` directly
3. Try to access `/checkout/address` directly
4. Try to access `/suppliers` directly

**Expected Results:**
- ✅ Redirected to login page
- ✅ After login, redirected back to original URL

---

### **Test Suite 2: Supplier Browsing**

#### **TS2.1: View Suppliers List**

**Steps:**
1. Login as contractor
2. Navigate to `/suppliers`
3. Observe supplier cards
4. Check zone badges
5. Click "عرض المنتجات" on a supplier

**Expected Results:**
- ✅ Suppliers displayed in grid layout
- ✅ Each card shows:
  - Business name (Arabic & English)
  - Address
  - Rating (if available)
  - Distance (if location granted)
  - Zone badge (A/B/Out of Range)
  - Delivery fees per vehicle type
- ✅ CartButton visible in header
- ✅ Clicking supplier redirects to `/products?supplierId={id}`

---

#### **TS2.2: Location-Based Sorting**

**Steps:**
1. Navigate to `/suppliers`
2. Allow geolocation when prompted
3. Observe supplier order
4. Check zone badges and distances

**Expected Results:**
- ✅ Browser requests geolocation permission
- ✅ Suppliers sorted by distance (closest first)
- ✅ Distance shown in km
- ✅ Zone badges accurate:
  - **Green (Zone A)**: Distance ≤ radius_km_zone_a
  - **Yellow (Zone B)**: Distance ≤ radius_km_zone_b
  - **Red (Out of Range)**: Distance > radius_km_zone_b

**Edge Cases:**
- Deny location permission → Suppliers shown without sorting
- Mock location outside all zones → All suppliers "Out of Range"

---

#### **TS2.3: Supplier Search**

**Steps:**
1. Navigate to `/suppliers`
2. Enter search term: `"أولى"` (first supplier name)
3. Click "بحث"
4. Verify filtering
5. Clear search and verify all suppliers return

**Expected Results:**
- ✅ Results filtered by business name (Arabic & English)
- ✅ Search is case-insensitive
- ✅ Clear search shows all suppliers again

---

### **Test Suite 3: Product Browsing**

#### **TS3.1: Browse All Products**

**Steps:**
1. Navigate to `/products`
2. Observe product grid
3. Check category sidebar
4. Verify CartButton in header

**Expected Results:**
- ✅ Products displayed in grid (3 columns on desktop)
- ✅ Each product card shows:
  - Arabic & English name
  - Category badge
  - Supplier name with rating
  - Price per unit
  - Min order quantity
  - Weight/volume specs (if available)
  - "أضف للسلة" button
- ✅ Category list on left sidebar
- ✅ "جميع المنتجات" selected by default

---

#### **TS3.2: Category Filtering**

**Steps:**
1. Navigate to `/products`
2. Click a top-level category (e.g., "الدهانات")
3. Observe filtered products
4. Click a sub-category
5. Click "جميع المنتجات" to reset

**Expected Results:**
- ✅ Products filtered by selected category
- ✅ Sub-categories indented and shown
- ✅ Active category highlighted
- ✅ Product count updates
- ✅ "إزالة جميع الفلاتر" button appears when filtered

---

#### **TS3.3: Product Search**

**Steps:**
1. Navigate to `/products`
2. Enter search term: `"أسمنت"` (cement)
3. Click "بحث"
4. Verify results
5. Search English term: `"paint"`

**Expected Results:**
- ✅ Results match Arabic name
- ✅ Results match English name
- ✅ Search works across both languages
- ✅ Empty state shown if no matches

---

#### **TS3.4: Supplier-Specific Products**

**Steps:**
1. Navigate to `/suppliers`
2. Click "عرض المنتجات" on any supplier
3. Verify URL: `/products?supplierId={id}`
4. Verify products filtered
5. Click "عرض الموردين" to return

**Expected Results:**
- ✅ Only products from selected supplier shown
- ✅ Supplier name displayed in header
- ✅ Category filtering still works
- ✅ Can clear filter to see all products

---

### **Test Suite 4: Cart Management**

#### **TS4.1: Add First Item to Cart**

**Steps:**
1. Navigate to `/products`
2. Click "أضف للسلة" on any product
3. Observe button feedback
4. Observe cart drawer opening
5. Check CartButton badge

**Expected Results:**
- ✅ Button changes to "✓ تمت الإضافة" for 2 seconds
- ✅ Cart drawer slides open from left (RTL)
- ✅ Item appears in cart with min_order_quantity
- ✅ CartButton shows badge with item count
- ✅ Supplier name shown in cart header
- ✅ Totals calculated correctly

---

#### **TS4.2: Add Multiple Items from Same Supplier**

**Steps:**
1. Add first product from Supplier A
2. Add second product from Supplier A
3. Add first product again (increase quantity)
4. Verify cart contents

**Expected Results:**
- ✅ Both products shown in cart
- ✅ First product quantity increased (not duplicated)
- ✅ Supplier name remains the same
- ✅ Subtotal updates correctly
- ✅ Item count badge accurate

---

#### **TS4.3: Add Item from Different Supplier (Multi-Supplier Cart)**

**Steps:**
1. Add product from Supplier A
2. Navigate to products from Supplier B
3. Click "أضف للسلة" on product from Supplier B
4. Observe cart drawer

**Expected Results:**
- ✅ No warning dialog (multi-supplier allowed)
- ✅ Cart shows both suppliers
- ✅ Items grouped by supplier with headers
- ✅ Blue info banner appears: "سيتم تقسيم طلبك إلى X طلبات منفصلة"
- ✅ Subtotal shown per supplier
- ✅ Grand total shown at bottom

---

#### **TS4.4: Update Item Quantity**

**Steps:**
1. Open cart drawer
2. Click "+" button on any item
3. Verify quantity increases
4. Click "-" button
5. When at min_order_quantity, observe trash icon
6. Click trash to remove

**Expected Results:**
- ✅ Quantity increases by 1
- ✅ Item total updates
- ✅ Overall subtotal updates
- ✅ Cannot go below min_order_quantity with minus
- ✅ Minus button shows trash icon when at minimum
- ✅ Clicking trash removes item

---

#### **TS4.5: Cart Persistence**

**Steps:**
1. Add multiple items to cart
2. Refresh the page
3. Close and reopen browser
4. Verify cart contents

**Expected Results:**
- ✅ Cart items persist after page refresh
- ✅ Cart items persist across browser sessions
- ✅ Cart cleared when last item removed
- ✅ localStorage updated on every cart change

---

#### **TS4.6: Clear Cart**

**Steps:**
1. Add multiple items to cart
2. Open cart drawer
3. Click "إفراغ السلة"
4. Confirm dialog
5. Verify cart empty

**Expected Results:**
- ✅ Confirmation dialog appears: "هل أنت متأكد من إفراغ السلة؟"
- ✅ If confirmed: Cart emptied, drawer shows empty state
- ✅ If cancelled: Cart remains unchanged
- ✅ CartButton badge disappears

---

### **Test Suite 5: Checkout Flow**

#### **TS5.1: Address Entry**

**Steps:**
1. Add items to cart
2. Click "إكمال الطلب"
3. Verify redirect to `/checkout/address`
4. Fill address form:
   - Click "استخدام موقعي الحالي"
   - Allow geolocation
   - Enter address details
   - Enter phone: `0791234567`
5. Click "التالي: اختيار الموعد"

**Expected Results:**
- ✅ Progress indicator shows Step 1 active
- ✅ Order summary displayed
- ✅ Geolocation button updates coordinates
- ✅ Form validation works:
  - Address required
  - Phone required (10 digits)
- ✅ Data saved to localStorage
- ✅ Redirect to `/checkout/schedule`

**Test Cases:**
- **Valid address**: Complete form → Success
- **Missing required field**: Submit → Error shown
- **Deny geolocation**: Coordinates remain default (Amman center)
- **Empty cart**: Should redirect back to `/products`

---

#### **TS5.2: Schedule Selection**

**Steps:**
1. Continue from address step
2. Verify address summary shown
3. Select date (default: tomorrow)
4. Select time slot (morning/afternoon/evening)
5. Read important notice
6. Click "التالي: مراجعة الطلب"

**Expected Results:**
- ✅ Progress shows Step 2 active, Step 1 completed (✓)
- ✅ Address editable via link
- ✅ Date picker:
  - Min date: tomorrow
  - Max date: 30 days from now
- ✅ Time slots selectable (radio buttons)
- ✅ Important notice displayed about supplier unloading
- ✅ Data saved to localStorage
- ✅ Redirect to `/checkout/review`

---

#### **TS5.3: Order Review - Single Supplier**

**Steps:**
1. Add items from ONE supplier
2. Complete address and schedule
3. Observe review page
4. Wait for vehicle estimation
5. Click "تأكيد الطلب والدفع"

**Expected Results:**
- ✅ Progress shows Step 3 active, Steps 1-2 completed
- ✅ Address and schedule shown with edit links
- ✅ One supplier order displayed:
  - Supplier name as header
  - All items listed with quantities and prices
  - Subtotal calculated
- ✅ Vehicle estimation:
  - Shows loading spinner initially
  - Displays vehicle name (Arabic)
  - Shows distance and zone
  - Shows delivery fee
- ✅ Final totals:
  - Subtotal
  - Delivery fee
  - Grand total
- ✅ "تأكيد الطلب والدفع" button enabled after estimation

**Estimation Test Cases:**
- **Success**: Shows vehicle, fee, zone
- **Out of range**: Error message shown, button disabled
- **No suitable vehicle**: Error message shown, button disabled

---

#### **TS5.4: Order Review - Multiple Suppliers**

**Steps:**
1. Add items from TWO suppliers
2. Complete address and schedule
3. Observe review page with two orders
4. Wait for both vehicle estimations
5. Verify totals

**Expected Results:**
- ✅ Blue info banner: "سيتم تقسيم طلبك إلى 2 طلبات منفصلة"
- ✅ Two supplier order sections displayed
- ✅ Each section shows:
  - Supplier name header
  - Item list
  - Subtotal
  - Vehicle estimation (separate for each)
  - Order total (subtotal + delivery fee)
- ✅ Grand total section:
  - Number of orders: 2
  - Combined subtotal
  - Combined delivery fees
  - Final total amount

---

#### **TS5.5: Complete Order Creation**

**Steps:**
1. Review page with all estimations loaded
2. Click "تأكيد الطلب والدفع"
3. Observe loading state
4. Observe success alert
5. Verify redirect
6. Check cart cleared

**Expected Results:**
- ✅ Button shows "جاري إنشاء الطلب..." with disabled state
- ✅ Success alert displays number of orders created
- ✅ Alert mentions escrow hold
- ✅ Redirect to `/products` (or `/orders` when implemented)
- ✅ Cart completely empty
- ✅ CartButton badge removed
- ✅ localStorage checkout data cleared

---

### **Test Suite 6: Payment & Order Verification**

#### **TS6.1: Verify Database Records - Single Order**

**Steps:**
1. Create order via UI
2. Note the order number from success message
3. Query database:

```sql
-- Check order created
SELECT * FROM orders WHERE order_number = 'ORD-YYYYMMDD-XXXXX';

-- Check order items
SELECT * FROM order_items WHERE order_id = '{order_id}';

-- Check payment held in escrow
SELECT * FROM payments WHERE order_id = '{order_id}';

-- Check delivery record
SELECT * FROM deliveries WHERE order_id = '{order_id}';
```

**Expected Results:**
- ✅ Order record exists with status = `'confirmed'`
- ✅ Subtotal, delivery fee, total calculated correctly
- ✅ Vehicle class ID and zone set
- ✅ Delivery address and coordinates stored
- ✅ Scheduled date and time saved
- ✅ Order items match cart items
- ✅ Payment record exists with status = `'held'`
- ✅ payment_intent_id populated (mock ID)
- ✅ held_at timestamp set
- ✅ Delivery record created
- ✅ If total < 120 JOD: confirmation_pin = NULL
- ✅ If total ≥ 120 JOD: confirmation_pin = 4-digit number

---

#### **TS6.2: Verify PIN Generation Threshold**

**Test Case A: Order < 120 JOD**

**Steps:**
1. Add items totaling ~100 JOD (subtotal + delivery)
2. Complete checkout
3. Query delivery record

```sql
SELECT o.total_jod, d.confirmation_pin
FROM orders o
JOIN deliveries d ON d.order_id = o.id
WHERE o.order_number = 'ORD-...';
```

**Expected Result:**
- ✅ total_jod < 120
- ✅ confirmation_pin IS NULL
- ✅ pin_verified = false

---

**Test Case B: Order ≥ 120 JOD**

**Steps:**
1. Add items totaling ~150 JOD
2. Complete checkout
3. Query delivery record

**Expected Result:**
- ✅ total_jod ≥ 120
- ✅ confirmation_pin IS NOT NULL
- ✅ confirmation_pin is 4-digit number (1000-9999)
- ✅ pin_verified = false

---

#### **TS6.3: Verify Multi-Supplier Order Split**

**Steps:**
1. Add items from Supplier A (~80 JOD)
2. Add items from Supplier B (~60 JOD)
3. Complete checkout
4. Query database:

```sql
-- Should see 2 orders
SELECT COUNT(*) FROM orders WHERE contractor_id = '{user_id}'
AND created_at > NOW() - INTERVAL '1 hour';

-- Check each order has correct supplier
SELECT order_number, supplier_id, total_jod
FROM orders
WHERE contractor_id = '{user_id}'
ORDER BY created_at DESC LIMIT 2;

-- Check payments held for both
SELECT o.order_number, p.status, p.amount_jod
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE o.contractor_id = '{user_id}'
ORDER BY p.created_at DESC LIMIT 2;
```

**Expected Results:**
- ✅ Exactly 2 order records created
- ✅ Each order has different supplier_id
- ✅ Each order has separate payment record
- ✅ Both payments have status = `'held'`
- ✅ Sum of payment amounts = total from cart
- ✅ PINs generated independently based on each order's total

---

### **Test Suite 7: Error Handling & Edge Cases**

#### **TS7.1: Out of Service Area**

**Steps:**
1. Add items to cart
2. Go to `/checkout/address`
3. Enter coordinates far from all suppliers (e.g., Aqaba when suppliers in Amman)
4. Complete address and schedule
5. Observe review page

**Expected Results:**
- ✅ Vehicle estimation shows error:
  - "Delivery location is outside the supplier service area"
- ✅ Error displayed in red box
- ✅ "تأكيد الطلب والدفع" button disabled
- ✅ Can edit address to fix issue

---

#### **TS7.2: No Suitable Vehicle**

**Steps:**
1. Add VERY heavy/large items (if available in test data)
2. Complete checkout
3. Observe review page

**Expected Results:**
- ✅ Vehicle estimation error:
  - "No suitable vehicle available for this order"
  - Shows required weight/volume/length
- ✅ Button disabled
- ✅ User can reduce quantities or change items

---

#### **TS7.3: Network Failure During Checkout**

**Steps:**
1. Open browser DevTools → Network tab
2. Add items and go to review page
3. Go offline (Disable network in DevTools)
4. Click "تأكيد الطلب والدفع"
5. Observe error

**Expected Results:**
- ✅ Error alert shown
- ✅ Button re-enabled
- ✅ Can retry when back online
- ✅ Cart data not lost

---

#### **TS7.4: Session Expiration**

**Steps:**
1. Login and add items to cart
2. Wait for session to expire (or clear session manually)
3. Try to checkout
4. Verify redirect to login

**Expected Results:**
- ✅ Redirect to login page
- ✅ After re-login, redirect back to checkout
- ✅ Cart data preserved

---

### **Test Suite 8: UI/UX & Responsiveness**

#### **TS8.1: RTL Layout Verification**

**Steps:**
1. Navigate through all pages
2. Verify text direction
3. Check component alignment

**Expected Results:**
- ✅ All text right-aligned
- ✅ Drawer slides from LEFT (not right)
- ✅ Badges positioned correctly
- ✅ Icons mirrored appropriately
- ✅ Form layouts flow right-to-left

---

#### **TS8.2: Mobile Responsiveness**

**Steps:**
1. Open DevTools → Responsive mode
2. Test on iPhone 13 viewport (390x844)
3. Navigate through full checkout flow

**Expected Results:**
- ✅ Products grid: 1 column on mobile
- ✅ Suppliers grid: 1 column on mobile
- ✅ Checkout steps readable and usable
- ✅ Cart drawer: Full width on mobile
- ✅ Buttons touch-friendly (min 44x44px)
- ✅ No horizontal scrolling

---

#### **TS8.3: Accessibility**

**Steps:**
1. Use keyboard only (no mouse)
2. Tab through entire checkout flow
3. Use screen reader (if available)

**Expected Results:**
- ✅ All interactive elements focusable
- ✅ Focus indicators visible
- ✅ Form labels associated with inputs
- ✅ Error messages announced
- ✅ Modal/drawer traps focus
- ✅ ESC key closes modals

---

## 🐛 Bug Reporting

### When You Find a Bug

1. **Stop and document immediately**
2. Take screenshots/screen recording
3. Note the exact steps to reproduce
4. Check browser console for errors
5. Record database state if relevant

### Bug Report Template

```markdown
## Bug Report #{Number}

**Severity:** 🔴 Critical / 🟡 Major / 🟢 Minor

**Component:** [Auth / Cart / Checkout / Products / etc.]

**Browser:** Chrome 120 / Safari 17 / Firefox 121

**Environment:**
- OS: macOS / Windows / Linux
- Screen size: Desktop / Mobile
- User role: Contractor / Supplier

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**


**Actual Result:**


**Screenshots:**
[Attach images]

**Console Errors:**
```
[Paste error messages]
```

**Database State:** (if relevant)
```sql
[Query results]
```

**Additional Context:**


**Workaround:** (if any)

```

---

## ✅ Test Sign-Off Checklist

Before considering testing complete:

### **Authentication & Profile**
- [ ] TS1.1: New user registration ✅
- [ ] TS1.2: Existing user login ✅
- [ ] TS1.3: Protected routes ✅

### **Browsing**
- [ ] TS2.1: Suppliers list ✅
- [ ] TS2.2: Location-based zones ✅
- [ ] TS2.3: Supplier search ✅
- [ ] TS3.1: Products list ✅
- [ ] TS3.2: Category filtering ✅
- [ ] TS3.3: Product search ✅
- [ ] TS3.4: Supplier-specific products ✅

### **Cart**
- [ ] TS4.1: Add first item ✅
- [ ] TS4.2: Multiple items (same supplier) ✅
- [ ] TS4.3: Multi-supplier cart ✅
- [ ] TS4.4: Update quantities ✅
- [ ] TS4.5: Cart persistence ✅
- [ ] TS4.6: Clear cart ✅

### **Checkout**
- [ ] TS5.1: Address entry ✅
- [ ] TS5.2: Schedule selection ✅
- [ ] TS5.3: Single supplier review ✅
- [ ] TS5.4: Multi-supplier review ✅
- [ ] TS5.5: Order creation ✅

### **Payment & Verification**
- [ ] TS6.1: Database records ✅
- [ ] TS6.2: PIN threshold logic ✅
- [ ] TS6.3: Multi-supplier split ✅

### **Error Handling**
- [ ] TS7.1: Out of service area ✅
- [ ] TS7.2: No suitable vehicle ✅
- [ ] TS7.3: Network failures ✅
- [ ] TS7.4: Session expiration ✅

### **UI/UX**
- [ ] TS8.1: RTL layout ✅
- [ ] TS8.2: Mobile responsive ✅
- [ ] TS8.3: Accessibility ✅

### **Bugs Found:** _____
### **Bugs Fixed:** _____
### **Known Issues:** _____

**Tested By:** _________________
**Date:** _________________
**Sign-off:** ✅ PASS / ❌ FAIL

---

## 📊 Test Metrics

Track these metrics across test cycles:

- **Total Test Cases**: 31
- **Pass Rate**: ____%
- **Avg. Time per Full Test**: ~2-3 hours
- **Bugs per 100 Tests**: ___
- **Critical Bugs**: ___
- **Test Coverage**: ___% (estimate based on completed scenarios)

---

**Next Steps After Manual Testing:**
1. Document all bugs found
2. Create issues in issue tracker
3. Proceed with automated test implementation
4. Re-test after bug fixes

---

*Last Updated: Phase 3 Complete - Ready for Phase 4 (Delivery & Tracking)*
