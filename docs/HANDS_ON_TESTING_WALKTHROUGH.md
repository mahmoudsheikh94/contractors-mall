# 🧪 Hands-On Testing Walkthrough

**Estimated Time**: 90 minutes
**Your Role**: Follow this guide step-by-step to test the payment and dispute systems

---

## 📋 PART 1: Setup (20 minutes)

### Step 1: Create Test Users in Supabase (10 min)

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb
   - Click: **Authentication** → **Users**

2. **Create Contractor User**:
   - Click "**Add User**" button
   - Email: `contractor-test@contractors-mall.com`
   - Password: `Test123!@#`
   - Check "**Auto Confirm User**" ✓
   - Click "**Create User**"
   - **IMPORTANT**: Copy the User ID (UUID) - you'll need this!
   - Example: `550e8400-e29b-41d4-a716-446655440000`

3. **Create Supplier User**:
   - Click "**Add User**" again
   - Email: `supplier-test@contractors-mall.com`
   - Password: `Test123!@#`
   - Check "**Auto Confirm User**" ✓
   - Click "**Create User**"
   - **Copy the User ID**

4. **Create Admin User**:
   - Click "**Add User**" again
   - Email: `admin-test@contractors-mall.com`
   - Password: `Test123!@#`
   - Check "**Auto Confirm User**" ✓
   - Click "**Create User**"
   - **Copy the User ID**

---

### Step 2: Set Up Test Data (10 min)

Now you have the 3 User IDs. Let's create the test accounts and data.

**Open your terminal** and run this SQL script (I'll prepare it for you):

```bash
# Create a file with your actual UUIDs
cat > /tmp/create-test-data.sql <<'EOF'
BEGIN;

-- ============= REPLACE THESE WITH YOUR ACTUAL USER IDS =============
-- Contractor UUID from Step 1.2:
\set CONTRACTOR_ID '550e8400-e29b-41d4-a716-446655440000'

-- Supplier UUID from Step 1.3:
\set SUPPLIER_ID '550e8400-e29b-41d4-a716-446655440001'

-- Admin UUID from Step 1.4:
\set ADMIN_ID '550e8400-e29b-41d4-a716-446655440002'
-- ===================================================================

-- Create contractor profile
INSERT INTO profiles (id, full_name, phone_number, role, email_verified, created_at, updated_at)
VALUES (
  :'CONTRACTOR_ID',
  'Ahmed Test Contractor',
  '+962791234567',
  'contractor',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create supplier profile
INSERT INTO profiles (id, full_name, phone_number, role, email_verified, created_at, updated_at)
VALUES (
  :'SUPPLIER_ID',
  'Mohammad Test Supplier',
  '+962791234568',
  'supplier_admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create admin profile
INSERT INTO profiles (id, full_name, phone_number, role, email_verified, created_at, updated_at)
VALUES (
  :'ADMIN_ID',
  'System Admin Test',
  '+962791234569',
  'admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create supplier business
INSERT INTO suppliers (
  id, owner_id, business_name, business_name_ar, business_type,
  license_number, tax_number, address, city, phone, email,
  status, verified, verification_date, created_at, updated_at
)
VALUES (
  '10000000-test-test-test-000000000001',
  :'SUPPLIER_ID',
  'Test Building Materials Co.',
  'شركة مواد البناء التجريبية',
  'materials_supplier',
  'LIC-TEST-12345',
  'TAX-TEST-67890',
  'Test Street, Industrial Area',
  'Amman',
  '+962791234568',
  'supplier@test.com',
  'active',
  true,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create supplier wallet
INSERT INTO wallets (
  supplier_id, available_balance, pending_balance,
  total_earned, total_withdrawn, created_at, updated_at
)
VALUES (
  '10000000-test-test-test-000000000001',
  0, 0, 0, 0, NOW(), NOW()
) ON CONFLICT (supplier_id) DO NOTHING;

-- Create test products
INSERT INTO products (
  id, supplier_id, category_id, name, name_ar, description, description_ar,
  sku, unit_price, unit_of_measure, stock_quantity, min_order_quantity,
  max_order_quantity, weight_kg, dimensions_cm, available, featured,
  created_at, updated_at
)
VALUES
  -- Product 1: Cement (50 JOD - for < 120 JOD test)
  (
    '30000000-test-test-test-000000000001',
    '10000000-test-test-test-000000000001',
    'c5555555-5555-5555-5555-555555555555', -- Cement category
    'Test Portland Cement 50kg',
    'اسمنت بورتلاند تجريبي 50 كجم',
    'High quality Portland cement for testing purposes',
    'اسمنت بورتلاند عالي الجودة لأغراض الاختبار',
    'TEST-CEM-001',
    50.00,
    'bag',
    1000,
    1,
    100,
    50.0,
    '{"length": 40, "width": 30, "height": 10}',
    true,
    true,
    NOW(),
    NOW()
  ),
  -- Product 2: Bricks (80 JOD - for ≥ 120 JOD test)
  (
    '30000000-test-test-test-000000000002',
    '10000000-test-test-test-000000000001',
    '728609a5-14e6-4d61-816c-3025b0ddfd8b', -- Bricks category
    'Test Red Bricks - Pallet',
    'طوب أحمر تجريبي - منصة',
    'Premium red bricks for construction testing',
    'طوب أحمر ممتاز للبناء والاختبار',
    'TEST-BRK-001',
    80.00,
    'pallet',
    500,
    1,
    50,
    800.0,
    '{"length": 120, "width": 80, "height": 50}',
    true,
    true,
    NOW(),
    NOW()
  ),
  -- Product 3: Paint (High value - for dispute testing)
  (
    '30000000-test-test-test-000000000003',
    '10000000-test-test-test-000000000001',
    'c0111111-1111-1111-1111-111111111111', -- Exterior Paints
    'Test Premium Exterior Paint - Bulk',
    'دهان خارجي ممتاز تجريبي - بالجملة',
    'Premium quality exterior paint for large projects',
    'دهان خارجي عالي الجودة للمشاريع الكبيرة',
    'TEST-PNT-001',
    400.00,
    'gallon',
    200,
    1,
    20,
    5.0,
    '{"length": 30, "width": 30, "height": 40}',
    true,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create delivery zones
INSERT INTO supplier_delivery_zones (
  id, supplier_id, zone_name, zone_type, base_delivery_fee,
  per_km_fee, max_distance_km, estimated_delivery_days,
  active, created_at, updated_at
)
VALUES
  (
    '40000000-test-test-test-000000000001',
    '10000000-test-test-test-000000000001',
    'Test Zone A - Central Amman',
    'zone_a',
    15.00,
    2.00,
    10,
    1,
    true,
    NOW(),
    NOW()
  ),
  (
    '40000000-test-test-test-000000000002',
    '10000000-test-test-test-000000000001',
    'Test Zone B - Greater Amman',
    'zone_b',
    30.00,
    3.00,
    25,
    2,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verification
SELECT 'Contractor:', id, full_name, role FROM profiles WHERE id = :'CONTRACTOR_ID';
SELECT 'Supplier:', id, full_name, role FROM profiles WHERE id = :'SUPPLIER_ID';
SELECT 'Admin:', id, full_name, role FROM profiles WHERE id = :'ADMIN_ID';
SELECT 'Products:', COUNT(*) FROM products WHERE supplier_id = '10000000-test-test-test-000000000001';
SELECT 'Wallet:', supplier_id, available_balance FROM wallets WHERE supplier_id = '10000000-test-test-test-000000000001';
EOF

# EDIT THE FILE TO ADD YOUR ACTUAL USER IDS (lines 5-11)
nano /tmp/create-test-data.sql

# Then run it:
PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f /tmp/create-test-data.sql
```

You should see output like:
```
BEGIN
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
INSERT 0 3
INSERT 0 2
COMMIT
 ?column? |                  id                  |      full_name       |    role
----------+--------------------------------------+----------------------+------------
 Contractor: | 550e8400... | Ahmed Test Contractor | contractor
...
```

---

## 🧪 PART 2: Test Payment Flow < 120 JOD (20 minutes)

### Test 2.1: Login as Contractor

1. **Open web app**: https://contractors-mall-web.vercel.app
2. **Click "Login" / "تسجيل الدخول"**
3. Enter:
   - Email: `contractor-test@contractors-mall.com`
   - Password: `Test123!@#`
4. Click "Sign In"
5. **✓ You should see**: Contractor dashboard

---

### Test 2.2: Browse and Add Product to Cart

1. **Browse products** or use search
2. Find "**Test Portland Cement 50kg**" (50 JOD)
3. Click on the product
4. **Add 2 bags** to cart (Total will be ~100 JOD + delivery < 120 JOD)
5. Click "**View Cart**"
6. **✓ Verify**:
   - 2x Test Portland Cement = 100 JOD
   - Delivery fee shown
   - Total < 120 JOD

---

### Test 2.3: Checkout and Payment

1. Click "**Proceed to Checkout**"
2. Enter delivery address:
   - Area: Amman, Jabal Amman (Zone A)
   - Street: Test Street 123
   - Building: Building 5
   - Notes: Test order - do not actually deliver
3. Review order details
4. **Payment method**: Mock card (if using mock provider):
   ```
   Card: 4111 1111 1111 1111
   Expiry: 12/25
   CVV: 123
   Name: Ahmed Test
   ```
5. Click "**Confirm Order**"
6. **✓ You should see**:
   - "Order placed successfully!"
   - Order number (e.g., ORD-2025-00001)
   - NO delivery PIN (because < 120 JOD)
   - Order appears in "My Orders"

**📝 Note the Order Number**: `________________`

---

### Test 2.4: Verify in Database

Open terminal and run:
```bash
PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT order_number, status, total_amount, delivery_pin FROM orders ORDER BY created_at DESC LIMIT 1;"
```

**✓ Expected**:
- `status` = 'pending_payment' or 'paid' or 'confirmed'
- `total_amount` = ~115 JOD (100 + ~15 delivery)
- `delivery_pin` = NULL

---

### Test 2.5: Supplier Confirms Delivery (Photo Upload)

1. **Logout** from contractor account
2. **Login as supplier**:
   - Go to: https://contractors-mall-admin.vercel.app
   - Email: `supplier-test@contractors-mall.com`
   - Password: `Test123!@#`

3. **Navigate to Orders**:
   - Click "Orders" in sidebar
   - Find the order from Test 2.3
   - Order should show status: "Pending Delivery" or similar

4. **Confirm Delivery**:
   - Click "Confirm Delivery" or "تأكيد التوصيل"
   - Upload a photo (any image from your computer)
   - Click "Submit"

5. **✓ You should see**:
   - "Delivery confirmed successfully!"
   - Order status changed to "Completed"
   - Payment released notification

---

### Test 2.6: Check Wallet Was Credited

Still as supplier:

1. Click "**Wallet**" in sidebar
2. **✓ Verify**:
   - Available Balance increased by ~103.5 JOD (115 * 0.90)
   - Total Earned shows ~103.5 JOD
   - Recent transaction shows credit for order

**Verify in Database**:
```bash
PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT available_balance, total_earned FROM wallets WHERE supplier_id = '10000000-test-test-test-000000000001';"
```

**✓ PASS if**:
- [x] Order created < 120 JOD
- [x] No PIN required
- [x] Photo uploaded successfully
- [x] Wallet credited 90% of total
- [x] Order status = 'completed'

---

## 🧪 PART 3: Test Payment Flow ≥ 120 JOD (20 minutes)

### Test 3.1: Create High-Value Order (as Contractor)

1. **Login as contractor** (if not already)
2. **Clear cart**
3. Find "**Test Red Bricks - Pallet**" (80 JOD)
4. Add **2 pallets** to cart (160 JOD + delivery ≥ 120 JOD)
5. **Checkout** with same address
6. **Complete payment**

7. **✓ IMPORTANT**: After payment, you should see:
   - Order confirmation
   - **6-digit Delivery PIN** displayed
   - Message: "Share this PIN with supplier upon delivery"

**📝 Write down the PIN**: `__ __ __ __ __ __`

**📝 Note Order Number**: `________________`

---

### Test 3.2: Supplier Confirms with PIN

1. **Logout and login as supplier**
2. **Go to Orders**
3. Find the high-value order from Test 3.1
4. Click "**Confirm Delivery**"
5. **Enter the 6-digit PIN** from Test 3.1
6. Optionally upload photo
7. Click "Submit"

**✓ Expected**:
- PIN accepted
- Delivery confirmed
- Payment released
- Wallet credited

---

### Test 3.3: Try Wrong PIN (Error Case)

**Create another ≥120 JOD order**, then:

1. As supplier, try to confirm delivery
2. Enter **wrong PIN**: `000000`
3. Click "Submit"

**✓ Expected**:
- **Error message**: "رقم التأكيد غير صحيح" (Incorrect PIN)
- Delivery NOT confirmed
- Payment still in escrow

---

## 🧪 PART 4: Test Dispute Workflow (30 minutes)

### Test 4.1: Contractor Opens Dispute

1. **Login as contractor**
2. **Go to "My Orders"**
3. Find a completed order
4. Click "**Report Issue**" or "فتح نزاع"

5. **Fill dispute form**:
   - Reason: "Damaged goods" or "البضاعة تالفة"
   - Description: "Several cement bags arrived damaged with torn packaging. Photos attached."
   - **Upload 2-3 photos** (any images showing "damage")
   - Click "Submit Dispute"

6. **✓ You should see**:
   - "Dispute created successfully"
   - Dispute ID
   - Status: "Pending Review"

**📝 Note Dispute ID**: `________________`

---

### Test 4.2: Verify Payment is Frozen

**Check database**:
```bash
PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT id, status, disputed_at FROM payment_transactions WHERE order_id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1);"
```

**✓ Expected**:
- `status` = 'disputed'
- `disputed_at` = recent timestamp

---

### Test 4.3: Supplier Responds to Dispute

1. **Logout and login as supplier**
2. **Click "Disputes"** in sidebar
3. Find the dispute from Test 4.1
4. Click to open dispute details

5. **Review**:
   - Contractor's claim
   - Evidence photos

6. **Add counter-evidence**:
   - Click "Upload Evidence"
   - Upload 2 photos (showing "undamaged goods")
   - Description: "All items were checked before dispatch. Photos show perfect condition."
   - Submit

7. **Send message**:
   - In dispute chat, type: "We have photo evidence that all items were in perfect condition"
   - Click "Send"

**✓ Expected**:
- Evidence uploaded
- Message appears in chat
- Contractor receives notification (if logged in)

---

### Test 4.4: Admin Resolves Dispute (Refund to Contractor)

1. **Logout and login as admin**:
   - Email: `admin-test@contractors-mall.com`
   - Password: `Test123!@#`

2. **Navigate to Admin Portal → Disputes**
3. Find the dispute
4. Click to view full details

5. **Review**:
   - Contractor's evidence
   - Supplier's counter-evidence
   - Messages exchanged
   - Timeline of events

6. **Make decision**:
   - Review notes: "After reviewing evidence, contractor's claim appears valid"
   - Select "**Refund to Contractor**"
   - Resolution amount: Full refund
   - Click "Resolve Dispute"

7. **✓ You should see**:
   - Dispute status: "Resolved - Refunded"
   - Refund initiated
   - Both parties notified

---

### Test 4.5: Verify Refund

**Check database**:
```bash
PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT status, resolution FROM disputes ORDER BY created_at DESC LIMIT 1;"
```

**✓ Expected**:
- `status` = 'resolved_refund' or similar
- `resolution` = admin's notes

**✓ PASS if**:
- [x] Dispute created successfully
- [x] Payment frozen during dispute
- [x] Evidence uploaded by both parties
- [x] Messages exchanged
- [x] Admin can resolve
- [x] Refund initiated

---

## 🎯 PART 5: Test Results Summary

Fill this out as you test:

### Payment < 120 JOD
- [ ] Order created successfully
- [ ] No PIN required
- [ ] Photo upload works
- [ ] Wallet credited correctly (90%)
- [ ] Order completed

### Payment ≥ 120 JOD
- [ ] Order created
- [ ] PIN generated and shown
- [ ] Correct PIN accepted
- [ ] Wrong PIN rejected
- [ ] Wallet credited

### Disputes
- [ ] Contractor can open dispute
- [ ] Payment frozen
- [ ] Evidence upload works
- [ ] Chat works
- [ ] Admin can resolve
- [ ] Refund processed

---

## 🐛 Report Issues

If you find any issues:

1. **Document**:
   - What you were doing
   - Expected result
   - Actual result
   - Screenshots

2. **Check database** to confirm state

3. **Create GitHub issue**:
```bash
gh issue create \
  --title "Bug: [Brief description]" \
  --body "**Test**: [Test number]
**Expected**: ...
**Actual**: ...
**Steps**: ...
**Screenshots**: ..."
```

---

## ✅ Success Criteria

**All tests pass if**:
- ✓ Can create orders both < 120 JOD and ≥ 120 JOD
- ✓ Photo verification works for small orders
- ✓ PIN verification works for large orders
- ✓ Payments held in escrow
- ✓ Delivery confirmation releases payment
- ✓ Wallet credited accurately (90% after 10% commission)
- ✓ Disputes freeze payments
- ✓ Evidence upload works
- ✓ Admin can resolve disputes
- ✓ Refunds process correctly

---

**You're all set! Start with Part 1 and work through each section. Good luck! 🚀**
