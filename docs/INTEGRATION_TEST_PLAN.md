# Integration Test Plan - Payment & Notification Systems

**Date**: 2025-11-14
**Status**: Ready for Testing
**Scope**: Payment escrow, delivery confirmation, disputes, and notifications

---

## Test Environment Setup

### Prerequisites
- ✅ Production database with regenerated types
- ✅ Both apps deployed to Vercel
- ✅ Supabase production instance (zbscashhrdeofvgjnbsb)
- ⏳ Test user accounts (contractor, supplier_admin, admin)
- ⏳ Mock payment provider configured

### Required Test Data
1. Contractor account with verified email
2. Supplier account with:
   - Approved/verified status
   - Products added
   - Delivery zones configured
   - Wallet initialized
3. Admin account for dispute resolution

---

## Test Suite 1: Payment Flow (< 120 JOD)

### Test 1.1: Order Creation with Photo Verification
**Description**: Create an order under 120 JOD and verify payment escrow
**User**: Contractor

**Steps**:
1. Browse supplier products
2. Add items to cart (total < 120 JOD)
3. Proceed to checkout
4. Select delivery address
5. Enter payment details (mock card)
6. Confirm order

**Expected Results**:
- ✓ Order created with status: `pending_payment`
- ✓ Payment intent created in `payment_transactions` table
- ✓ Transaction status: `pending`
- ✓ Notification sent to contractor (order confirmation)
- ✓ Notification sent to supplier (new order)

**DB Verification Queries**:
```sql
-- Check order was created
SELECT id, order_number, status, total_amount, contractor_id, supplier_id
FROM orders
WHERE order_number = '<ORDER_NUMBER>';

-- Check payment transaction
SELECT id, status, amount, provider, metadata
FROM payment_transactions
WHERE order_id = '<ORDER_ID>';
```

---

### Test 1.2: Delivery Confirmation (Photo Upload)
**Description**: Supplier uploads delivery photo to complete order < 120 JOD
**User**: Supplier Admin

**Steps**:
1. Navigate to Supplier Portal → Orders
2. Find the order from Test 1.1
3. Click "Confirm Delivery"
4. Upload delivery photo
5. Submit confirmation

**Expected Results**:
- ✓ Delivery proof uploaded to `delivery-proofs` storage bucket
- ✓ Delivery record created in `deliveries` table
- ✓ Order status updated to: `completed`
- ✓ Payment transaction status: `released`
- ✓ Supplier wallet credited (90% of total - 10% commission)
- ✓ Wallet transaction created with type: `credit`
- ✓ Notification sent to contractor (delivery confirmed)
- ✓ Notification sent to supplier (payment released)

**DB Verification Queries**:
```sql
-- Check delivery was recorded
SELECT id, order_id, delivery_proof_url, confirmed_at
FROM deliveries
WHERE order_id = '<ORDER_ID>';

-- Check payment was released
SELECT id, status, released_at, supplier_amount, platform_amount
FROM payment_transactions
WHERE order_id = '<ORDER_ID>';

-- Check wallet was updated
SELECT id, available_balance, total_earned
FROM wallets
WHERE supplier_id = '<SUPPLIER_ID>';

-- Check wallet transaction
SELECT id, type, amount, description, status
FROM wallet_transactions
WHERE order_id = '<ORDER_ID>';
```

---

## Test Suite 2: Payment Flow (≥ 120 JOD)

### Test 2.1: Order Creation with PIN Verification
**Description**: Create an order of 120 JOD or more requiring PIN confirmation
**User**: Contractor

**Steps**:
1. Browse supplier products
2. Add items to cart (total ≥ 120 JOD)
3. Proceed to checkout
4. Note the delivery PIN displayed
5. Complete payment

**Expected Results**:
- ✓ Order created with status: `pending_payment`
- ✓ Delivery PIN generated and stored in orders table
- ✓ PIN displayed to contractor in UI
- ✓ Payment held in escrow
- ✓ Notifications sent

**DB Verification Queries**:
```sql
SELECT id, order_number, status, total_amount, delivery_pin
FROM orders
WHERE order_number = '<ORDER_NUMBER>';
```

---

### Test 2.2: Delivery Confirmation (PIN Entry)
**Description**: Supplier enters PIN to confirm delivery of order ≥ 120 JOD
**User**: Supplier Admin

**Steps**:
1. Navigate to Supplier Portal → Orders
2. Find the order from Test 2.1
3. Click "Confirm Delivery"
4. Enter the 6-digit PIN from Test 2.1
5. Upload optional delivery photo
6. Submit confirmation

**Expected Results**:
- ✓ PIN validated successfully
- ✓ Delivery confirmed
- ✓ Order status: `completed`
- ✓ Payment released from escrow
- ✓ Wallet credited
- ✓ Notifications sent

---

### Test 2.3: Invalid PIN Rejection
**Description**: Verify that incorrect PIN is rejected
**User**: Supplier Admin

**Steps**:
1. Navigate to order from Test 2.1
2. Enter incorrect PIN (e.g., 000000)
3. Attempt to submit

**Expected Results**:
- ✗ Error message: "رقم التأكيد غير صحيح"
- ✗ Delivery NOT confirmed
- ✗ Order status remains: `pending_delivery`
- ✗ Payment remains in escrow

---

## Test Suite 3: Dispute Workflow

### Test 3.1: Contractor Initiates Dispute
**Description**: Contractor reports issue with delivered order
**User**: Contractor

**Steps**:
1. Navigate to Order Details page
2. Click "Report Issue" / "فتح نزاع"
3. Select dispute reason (e.g., "Damaged goods")
4. Enter detailed description
5. Upload evidence photos
6. Submit dispute

**Expected Results**:
- ✓ Dispute record created in `disputes` table with status: `pending`
- ✓ Dispute event logged in `dispute_events` (type: `created`)
- ✓ Evidence files uploaded to `dispute-evidence` storage bucket
- ✓ Evidence records created in `dispute_evidence` table
- ✓ Payment transaction status updated to: `disputed`
- ✓ Payment frozen (cannot be released)
- ✓ Order status updated to: `disputed`
- ✓ Notification sent to admin (new dispute)
- ✓ Notification sent to supplier (order disputed)

**DB Verification Queries**:
```sql
-- Check dispute was created
SELECT id, order_id, reason, status, created_at
FROM disputes
WHERE order_id = '<ORDER_ID>';

-- Check payment is frozen
SELECT id, status, disputed_at, dispute_id
FROM payment_transactions
WHERE order_id = '<ORDER_ID>';

-- Check dispute events
SELECT id, event_type, description, user_id
FROM dispute_events
WHERE dispute_id = '<DISPUTE_ID>'
ORDER BY created_at DESC;

-- Check evidence
SELECT id, file_name, file_url, uploaded_by
FROM dispute_evidence
WHERE dispute_id = '<DISPUTE_ID>';
```

---

### Test 3.2: Supplier Responds to Dispute
**Description**: Supplier uploads counter-evidence and responds
**User**: Supplier Admin

**Steps**:
1. Navigate to Disputes section
2. View dispute from Test 3.1
3. Read contractor's claim
4. Upload counter-evidence (photos/documents)
5. Send message via dispute chat
6. Submit response

**Expected Results**:
- ✓ Evidence uploaded to `dispute_evidence` table
- ✓ Dispute event logged (type: `evidence_uploaded`)
- ✓ Message added to `dispute_messages` table
- ✓ Dispute event logged (type: `message_sent`)
- ✓ Notification sent to admin (supplier responded)
- ✓ Real-time message appears in contractor's view (if online)

---

### Test 3.3: Admin Reviews and Resolves Dispute (Favor Contractor - Refund)
**Description**: Admin reviews evidence and issues refund to contractor
**User**: Admin

**Steps**:
1. Navigate to Admin Portal → Disputes
2. Open dispute from Test 3.1
3. Review timeline, evidence, and messages
4. Decide to refund contractor
5. Enter resolution notes
6. Select "Refund to Contractor"
7. Submit decision

**Expected Results**:
- ✓ Dispute status updated to: `resolved_refund`
- ✓ Dispute event logged (type: `resolved`)
- ✓ Refund request created in `refund_requests` table
- ✓ Payment transaction refund initiated via payment provider
- ✓ Order status updated to: `refunded`
- ✓ Notification sent to contractor (dispute resolved - refunded)
- ✓ Notification sent to supplier (dispute resolved - no payment)

**DB Verification Queries**:
```sql
-- Check dispute resolution
SELECT id, status, resolution, resolved_at, resolved_by
FROM disputes
WHERE id = '<DISPUTE_ID>';

-- Check refund request
SELECT id, transaction_id, amount, status, requested_by
FROM refund_requests
WHERE transaction_id = '<TRANSACTION_ID>';

-- Check payment transaction
SELECT id, status, refunded_amount
FROM payment_transactions
WHERE id = '<TRANSACTION_ID>';
```

---

### Test 3.4: Admin Resolves Dispute (Favor Supplier - Release Payment)
**Description**: Admin reviews evidence and releases payment to supplier
**User**: Admin

**Steps**:
1. Create a new disputed order (repeat Tests 3.1-3.2)
2. Navigate to Admin Portal → Disputes
3. Review evidence (supplier in the right)
4. Decide to release payment to supplier
5. Enter resolution notes
6. Select "Release Payment to Supplier"
7. Submit decision

**Expected Results**:
- ✓ Dispute status: `resolved_supplier_favor`
- ✓ Payment released from disputed state
- ✓ Wallet credited (supplier receives payment - commission)
- ✓ Order status: `completed`
- ✓ Notifications sent to both parties

---

### Test 3.5: High-Value Dispute Triggers Site Visit
**Description**: Dispute on order ≥ 350 JOD triggers site visit workflow
**User**: Admin

**Steps**:
1. Create order ≥ 350 JOD
2. Initiate dispute (Test 3.1 flow)
3. Admin attempts to resolve dispute
4. System should require/suggest site visit

**Expected Results**:
- ✓ Dispute marked as requiring site visit (if configured threshold met)
- ✓ Site visit can be scheduled in admin panel
- ✓ Dispute cannot be resolved until site visit completed or override
- ✓ Admin can override and resolve without site visit (with note)

---

## Test Suite 4: Notification System

### Test 4.1: Order Status Change Notifications
**Description**: Verify notifications are sent on each order state transition

**Test Cases**:
1. Order created → Contractor & Supplier receive notification
2. Payment confirmed → Contractor receives confirmation
3. Order in delivery → Contractor notified (optional)
4. Delivery confirmed → Both parties notified
5. Order completed → Both parties notified

**Verification**:
```sql
SELECT * FROM notifications
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC
LIMIT 20;
```

---

### Test 4.2: Dispute Notifications
**Description**: Verify dispute-related notifications

**Test Cases**:
1. Dispute opened → Admin + Supplier notified
2. Evidence uploaded → Admin notified
3. Message sent → Receiving party notified
4. Dispute resolved → Both parties notified

---

### Test 4.3: Real-time Notifications
**Description**: Verify real-time notification updates via Supabase Realtime

**Steps**:
1. Open app in two browsers (contractor + supplier)
2. Create dispute as contractor
3. Observe supplier browser

**Expected Results**:
- ✓ Notification badge updates in real-time
- ✓ Toast/alert appears without page refresh
- ✓ Notification list updates

---

## Test Suite 5: Wallet Management

### Test 5.1: Supplier Views Wallet Balance
**Description**: Verify wallet dashboard displays correct information
**User**: Supplier Admin

**Steps**:
1. Navigate to Supplier Portal → Wallet
2. Review wallet metrics

**Expected Results**:
- ✓ Available balance displayed (after completed orders)
- ✓ Pending balance displayed (escrow held funds)
- ✓ Total earned displayed (lifetime earnings)
- ✓ Recent transactions listed

---

### Test 5.2: Wallet Transaction History
**Description**: Verify all wallet transactions are logged correctly

**Expected Results**:
```sql
SELECT id, type, amount, description, status, created_at
FROM wallet_transactions
WHERE wallet_id = '<WALLET_ID>'
ORDER BY created_at DESC;
```

Should show:
- ✓ Credits for completed orders
- ✓ Debits for refunds (if any)
- ✓ Correct timestamps
- ✓ Order references

---

## Test Suite 6: Escrow Scheduled Release

### Test 6.1: Auto-Release After Delivery Window
**Description**: Payment automatically released if no dispute within X days
**Prerequisites**: Configure escrow_release_date on payment_transactions

**Steps**:
1. Create order with delivery_confirmed_at timestamp
2. Set escrow_release_date to past date
3. Run scheduled job (manually trigger):
   ```bash
   # Call the API endpoint or run Supabase Edge Function
   curl -X POST https://app.contractors-mall.com/api/payment/process-scheduled-releases
   ```

**Expected Results**:
- ✓ Payment released automatically
- ✓ Wallet credited
- ✓ Order status: `completed`
- ✓ Transaction log shows auto-release

---

## Test Suite 7: Edge Cases & Error Handling

### Test 7.1: Insufficient Wallet Balance for Refund
**Description**: Verify handling when supplier wallet has insufficient funds

**Steps**:
1. Supplier has 50 JOD in wallet
2. Admin initiates 100 JOD refund to contractor
3. Observe behavior

**Expected Results**:
- ✓ Refund still processes (deducts from escrow, not wallet)
- ✓ Wallet balance may go negative (tracked as debt)
- ✓ Admin notified of negative balance

---

### Test 7.2: Duplicate Delivery Confirmation Attempt
**Description**: Verify system prevents double-confirmation

**Steps**:
1. Complete delivery confirmation
2. Attempt to confirm same order again

**Expected Results**:
- ✗ Error: "Order already confirmed"
- ✗ No duplicate payment release
- ✗ No duplicate wallet credit

---

### Test 7.3: Concurrent Dispute Creation
**Description**: Verify only one dispute can be opened per order

**Steps**:
1. Open dispute on order
2. Attempt to open another dispute on same order

**Expected Results**:
- ✗ Error: "Dispute already exists for this order"
- ✗ Only one dispute record in database

---

## Test Suite 8: Invoice System

### Test 8.1: Supplier Creates Invoice
**Description**: Supplier generates invoice for order
**User**: Supplier Admin

**Steps**:
1. Navigate to Supplier Portal → Invoices
2. Click "Create Invoice"
3. Select order (from completed orders)
4. Invoice auto-populated with order details
5. Add line items (if needed)
6. Save invoice

**Expected Results**:
- ✓ Invoice created with status: `draft`
- ✓ Invoice number auto-generated
- ✓ Order linked to invoice
- ✓ Line items match order items
- ✓ Totals calculated correctly

---

### Test 8.2: Issue Invoice to Contractor
**Description**: Supplier issues final invoice

**Steps**:
1. Open draft invoice from Test 8.1
2. Review details
3. Click "Issue Invoice"
4. Confirm action

**Expected Results**:
- ✓ Invoice status: `issued`
- ✓ Invoice PDF generated (if implemented)
- ✓ Notification sent to contractor
- ✓ Invoice appears in contractor's order details

---

## Performance & Security Tests

### Perf Test 1: Page Load Times
**Acceptance Criteria**: LCP ≤ 3s on 4G in Amman

**Pages to Test**:
1. Contractor home page
2. Product listing page
3. Supplier dashboard
4. Admin disputes page

**Tool**: Lighthouse CI or WebPageTest

---

### Perf Test 2: API Response Times
**Acceptance Criteria**:
- Read endpoints: P95 ≤ 400ms
- Write endpoints: P95 ≤ 800ms

**Endpoints to Test**:
1. GET /api/products
2. POST /api/orders
3. POST /api/deliveries/confirm
4. POST /api/disputes

---

### Security Test 1: RLS Policy Verification
**Description**: Verify Row-Level Security prevents unauthorized access

**Test Cases**:
1. Contractor A cannot view Contractor B's orders
2. Supplier A cannot view Supplier B's wallet
3. Non-admin cannot access admin endpoints
4. Contractor cannot modify supplier data

---

### Security Test 2: Payment Data Protection
**Description**: Verify sensitive payment data is protected

**Checks**:
- ✓ No credit card numbers stored in plain text
- ✓ Payment tokens encrypted/hashed
- ✓ PCI compliance (if applicable)
- ✓ No payment details logged

---

## Rollback Plan

If critical issues found during testing:

1. **Immediate Actions**:
   - Disable payment processing (switch to maintenance mode)
   - Notify users via notification banner
   - Log all issues in GitHub Issues

2. **Rollback Steps**:
   ```bash
   # Revert to previous deployment
   git revert <COMMIT_HASH>
   git push origin main

   # Or rollback via Vercel Dashboard
   # Vercel → Deployments → Previous → Promote to Production
   ```

3. **Database Rollback** (if schema changed):
   ```bash
   # Revert migration
   pnpm supabase db reset --db-url "<PRODUCTION_URL>"
   ```

---

## Test Execution Tracking

| Test ID | Status | Tester | Date | Notes |
|---------|--------|--------|------|-------|
| 1.1 | ⏳ Pending | - | - | - |
| 1.2 | ⏳ Pending | - | - | - |
| 2.1 | ⏳ Pending | - | - | - |
| 2.2 | ⏳ Pending | - | - | - |
| 2.3 | ⏳ Pending | - | - | - |
| 3.1 | ⏳ Pending | - | - | - |
| 3.2 | ⏳ Pending | - | - | - |
| 3.3 | ⏳ Pending | - | - | - |
| 3.4 | ⏳ Pending | - | - | - |
| 3.5 | ⏳ Pending | - | - | - |
| 4.1 | ⏳ Pending | - | - | - |
| 4.2 | ⏳ Pending | - | - | - |
| 4.3 | ⏳ Pending | - | - | - |
| 5.1 | ⏳ Pending | - | - | - |
| 5.2 | ⏳ Pending | - | - | - |
| 6.1 | ⏳ Pending | - | - | - |
| 7.1 | ⏳ Pending | - | - | - |
| 7.2 | ⏳ Pending | - | - | - |
| 7.3 | ⏳ Pending | - | - | - |
| 8.1 | ⏳ Pending | - | - | - |
| 8.2 | ⏳ Pending | - | - | - |

---

## Next Steps

1. ✅ Create test accounts (contractor, supplier, admin)
2. ⏳ Execute Test Suite 1 (Payment < 120 JOD)
3. ⏳ Execute Test Suite 2 (Payment ≥ 120 JOD)
4. ⏳ Execute Test Suite 3 (Disputes)
5. ⏳ Execute Test Suite 4 (Notifications)
6. ⏳ Execute Test Suite 5 (Wallets)
7. ⏳ Execute Performance & Security Tests
8. ⏳ Document findings and create bug reports
9. ⏳ Fix critical issues
10. ⏳ Re-test fixed issues
11. ⏳ Sign-off for production launch

---

**Test Lead**: TBD
**Sign-off Required From**: Product Owner, Tech Lead
**Target Completion**: TBD
