# Testing Quick Start Guide

**Last Updated**: 2025-11-14
**Status**: Ready for Execution

---

## Prerequisites Checklist

- [ ] Both apps deployed to Vercel (✅ Complete)
- [ ] Production database accessible (✅ Complete)
- [ ] Test accounts created (⏳ Pending - follow steps below)
- [ ] Integration test plan reviewed (✅ docs/INTEGRATION_TEST_PLAN.md)

---

## Step 1: Create Test Auth Users (5 minutes)

### Via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb
2. Navigate to: **Authentication** → **Users** → **Add User**
3. Create these three users:

| Email | Password | Role (to assign later) |
|-------|----------|------------------------|
| `contractor-test@contractors-mall.com` | `Test123!@#` | contractor |
| `supplier-test@contractors-mall.com` | `Test123!@#` | supplier_admin |
| `admin-test@contractors-mall.com` | `Test123!@#` | admin |

4. **Copy each user's UUID** - you'll need these for the next step

---

## Step 2: Set Up Test Data (10 minutes)

### Option A: Using SQL Script (Recommended)

1. Open `scripts/setup-test-accounts.sql`
2. Replace placeholder UUIDs with actual auth user IDs:
   ```sql
   -- Line 22: Replace with contractor UUID
   '00000000-0000-0000-0000-000000000001'

   -- Line 44: Replace with supplier UUID
   '00000000-0000-0000-0000-000000000002'

   -- Line 104: Replace with admin UUID
   '00000000-0000-0000-0000-000000000003'
   ```

3. Connect to production database:
   ```bash
   PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
     "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
     -f scripts/setup-test-accounts.sql
   ```

4. Verify setup with the verification queries at the end of the script

### Option B: Using Supabase SQL Editor

1. Go to: **SQL Editor** in Supabase Dashboard
2. Copy contents of `scripts/setup-test-accounts.sql`
3. Replace UUIDs as described above
4. Click "Run"
5. Verify results in the output panel

---

## Step 3: Verify Test Accounts (2 minutes)

### Test Login for Each Role:

**Contractor Portal** (https://contractors-mall-web.vercel.app):
```
Email: contractor-test@contractors-mall.com
Password: Test123!@#
Expected: Should see contractor dashboard
```

**Supplier Portal** (https://contractors-mall-admin.vercel.app):
```
Email: supplier-test@contractors-mall.com
Password: Test123!@#
Expected: Should see supplier dashboard with:
  - Products section
  - Orders section
  - Wallet showing 0 JOD balance
```

**Admin Portal** (https://contractors-mall-admin.vercel.app):
```
Email: admin-test@contractors-mall.com
Password: Test123!@#
Expected: Should see admin dashboard with:
  - Suppliers section
  - Disputes section
  - Settings section
```

---

## Step 4: Execute Test Suite 1 - Payment < 120 JOD (30 minutes)

### Test 1.1: Create Order with Photo Verification

**As Contractor** (`contractor-test@contractors-mall.com`):

1. Navigate to product listing
2. Find "Test Portland Cement 50kg" (50 JOD)
3. Add **2 bags** to cart (Total: 100 JOD + delivery < 120 JOD)
4. Proceed to checkout
5. Enter delivery address
6. Complete payment with mock card:
   ```
   Card Number: 4111 1111 1111 1111
   Expiry: 12/25
   CVV: 123
   Name: Test Contractor
   ```
7. **Note the Order Number** displayed

**Database Verification**:
```sql
-- Check order was created
SELECT id, order_number, status, total_amount, delivery_pin
FROM orders
WHERE order_number = '<YOUR_ORDER_NUMBER>'
  AND contractor_id = '<CONTRACTOR_UUID>';

-- Expected:
-- status = 'pending_payment' or 'paid'
-- delivery_pin = NULL (because < 120 JOD)

-- Check payment transaction
SELECT id, status, amount, provider
FROM payment_transactions
WHERE order_id = '<ORDER_ID_FROM_ABOVE>';

-- Expected:
-- status = 'pending' or 'captured'
-- amount = <total from order>
```

**✓ Pass Criteria**:
- [ ] Order created successfully
- [ ] Payment transaction record exists
- [ ] No delivery PIN generated (< 120 JOD)
- [ ] Order appears in contractor's order history

---

### Test 1.2: Confirm Delivery with Photo

**As Supplier** (`supplier-test@contractors-mall.com`):

1. Navigate to **Orders** section
2. Find the order from Test 1.1
3. Click "Confirm Delivery"
4. Upload a delivery photo (any image file)
5. Submit confirmation

**Database Verification**:
```sql
-- Check delivery was recorded
SELECT id, order_id, delivery_proof_url, confirmed_at
FROM deliveries
WHERE order_id = '<ORDER_ID>';

-- Check payment was released
SELECT id, status, released_at, supplier_amount, platform_amount
FROM payment_transactions
WHERE order_id = '<ORDER_ID>';

-- Expected:
-- status = 'released'
-- supplier_amount = total * 0.90 (90% after 10% commission)
-- platform_amount = total * 0.10

-- Check wallet was credited
SELECT available_balance, total_earned
FROM wallets
WHERE supplier_id = '<SUPPLIER_ID>';

-- Expected:
-- available_balance increased by supplier_amount
-- total_earned increased by supplier_amount
```

**✓ Pass Criteria**:
- [ ] Delivery confirmed successfully
- [ ] Photo uploaded to storage
- [ ] Payment released from escrow
- [ ] Wallet credited with 90% of order total
- [ ] Order status = 'completed'

---

## Step 5: Execute Test Suite 2 - Payment ≥ 120 JOD (30 minutes)

### Test 2.1: Create Order with PIN Verification

**As Contractor**:

1. Clear cart
2. Add "Test Steel Rebar 12mm" (80 JOD)
3. Add **2 pieces** (Total: 160 JOD + delivery ≥ 120 JOD)
4. Checkout and complete payment
5. **IMPORTANT: Copy the 6-digit Delivery PIN** displayed after payment
6. Note the Order Number

**Database Verification**:
```sql
SELECT id, order_number, delivery_pin, total_amount
FROM orders
WHERE order_number = '<ORDER_NUMBER>';

-- Expected:
-- delivery_pin = 6-digit number (not NULL)
-- total_amount >= 120
```

**✓ Pass Criteria**:
- [ ] Order created
- [ ] Delivery PIN generated and displayed to contractor
- [ ] Payment held in escrow

---

### Test 2.2: Confirm Delivery with PIN

**As Supplier**:

1. Go to Orders
2. Find order from Test 2.1
3. Click "Confirm Delivery"
4. Enter the **6-digit PIN** from Test 2.1
5. Optionally upload delivery photo
6. Submit

**✓ Pass Criteria**:
- [ ] PIN accepted
- [ ] Delivery confirmed
- [ ] Payment released
- [ ] Wallet credited

---

### Test 2.3: Reject Invalid PIN

**Create another ≥120 JOD order**, then:

**As Supplier**:

1. Try to confirm delivery
2. Enter **wrong PIN** (e.g., 000000)
3. Submit

**✓ Pass Criteria**:
- [ ] Error message: "رقم التأكيد غير صحيح"
- [ ] Delivery NOT confirmed
- [ ] Payment remains in escrow

---

## Step 6: Execute Test Suite 3 - Disputes (45 minutes)

### Test 3.1: Open Dispute

**As Contractor**:

1. Find a completed order
2. Click "Report Issue" / "فتح نزاع"
3. Select reason: "Damaged goods"
4. Description: "Items arrived damaged, photos attached"
5. Upload 2-3 evidence photos
6. Submit

**Database Verification**:
```sql
-- Check dispute created
SELECT id, order_id, reason, status
FROM disputes
WHERE order_id = '<ORDER_ID>';

-- Check payment frozen
SELECT status, disputed_at
FROM payment_transactions
WHERE order_id = '<ORDER_ID>';

-- Expected status = 'disputed'

-- Check evidence uploaded
SELECT file_name, file_url
FROM dispute_evidence
WHERE dispute_id = '<DISPUTE_ID>';
```

**✓ Pass Criteria**:
- [ ] Dispute created
- [ ] Evidence uploaded
- [ ] Payment status = 'disputed'
- [ ] Order status = 'disputed'

---

### Test 3.2: Supplier Responds

**As Supplier**:

1. Navigate to **Disputes** section
2. Open the dispute
3. Review contractor's claim
4. Upload counter-evidence
5. Send message: "Goods were in perfect condition upon delivery"

**✓ Pass Criteria**:
- [ ] Evidence uploaded successfully
- [ ] Message appears in dispute chat
- [ ] Contractor can see supplier's response (if logged in)

---

### Test 3.3: Admin Resolves (Refund)

**As Admin** (`admin-test@contractors-mall.com`):

1. Navigate to **Admin Portal** → **Disputes**
2. Open the dispute
3. Review timeline, evidence, messages
4. Add resolution notes
5. Select "Refund to Contractor"
6. Submit

**Database Verification**:
```sql
-- Check dispute resolved
SELECT status, resolution, resolved_at
FROM disputes
WHERE id = '<DISPUTE_ID>';

-- Check refund initiated
SELECT status, amount
FROM refund_requests
WHERE transaction_id = '<TRANSACTION_ID>';
```

**✓ Pass Criteria**:
- [ ] Dispute status = 'resolved_refund'
- [ ] Refund request created
- [ ] Notifications sent to both parties

---

## Step 7: Monitor & Document Results (Ongoing)

### Update Test Tracking Table

In `docs/INTEGRATION_TEST_PLAN.md`, update the tracking table:

```markdown
| Test ID | Status | Tester | Date | Notes |
|---------|--------|--------|------|-------|
| 1.1 | ✅ Pass | [Your Name] | 2025-11-14 | Order #ORD-12345 |
| 1.2 | ✅ Pass | [Your Name] | 2025-11-14 | Wallet credited correctly |
| 2.1 | ✅ Pass | [Your Name] | 2025-11-14 | PIN: 123456 |
...
```

### Log Any Issues Found

Create GitHub issues for bugs:

```bash
# Example: Create issue for bug found during testing
gh issue create \
  --title "Payment release fails when wallet has negative balance" \
  --body "**Test**: Suite 7, Test 7.1

**Expected**: Payment should release even if wallet negative
**Actual**: Transaction fails with error
**Steps to Reproduce**: ...
**Screenshots**: ..." \
  --label "bug,testing"
```

---

## Common Issues & Solutions

### Issue: "Authentication error" when logging in
**Solution**: Verify email is confirmed in Supabase Auth → Users

### Issue: Supplier can't see products
**Solution**: Check `supplier_id` matches in products table

### Issue: Payment fails with "Provider not initialized"
**Solution**: Check environment variables for PAYMENT_PROVIDER

### Issue: Wallet not updating
**Solution**: Verify wallet exists for supplier, check RLS policies

### Issue: Delivery confirmation button disabled
**Solution**: Check order status is 'pending_delivery'

---

## Performance Testing Commands

```bash
# Test page load time
lighthouse https://contractors-mall-web.vercel.app --output=html --output-path=./test-results/lighthouse-web.html

# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://contractors-mall-web.vercel.app/api/products"
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
```

---

## Next Steps After Testing

1. ✅ Complete all test suites
2. ✅ Document all findings
3. ✅ Fix critical bugs
4. ✅ Re-test fixed issues
5. ✅ Get sign-off from stakeholders
6. ✅ Prepare for production launch

---

## Support & Resources

- **Test Plan**: `docs/INTEGRATION_TEST_PLAN.md`
- **Test Data Setup**: `scripts/setup-test-accounts.sql`
- **Database Connection**: See `.env.production` for credentials
- **Vercel Dashboards**:
  - Web: https://vercel.com/mahmoudsheikh94/contractors-mall-web
  - Admin: https://vercel.com/mahmoudsheikh94/contractors-mall-admin

---

**Happy Testing! 🧪**
