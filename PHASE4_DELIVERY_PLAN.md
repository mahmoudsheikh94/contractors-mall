# Phase 4: Delivery & Confirmation - Implementation Plan

**Date**: October 29, 2025
**Status**: Planning → Implementation

---

## 🎯 Phase 4 Goals

Implement the delivery confirmation and payment release system that enables:
1. Contractors to track their orders
2. Suppliers to confirm deliveries
3. Automated payment release after delivery proof
4. Dispute reporting and handling

---

## 📋 Features to Implement

### 1. **Order Tracking** (Contractor View)
- [ ] Orders list page (`/orders`)
- [ ] Order details page (`/orders/[orderId]`)
- [ ] Real-time order status display
- [ ] Delivery progress indicator
- [ ] Expected delivery date/time
- [ ] Supplier contact information
- [ ] Order items summary

### 2. **Delivery Confirmation System**
#### Photo Proof (Orders <120 JOD)
- [ ] Photo upload interface for supplier
- [ ] Image storage (Supabase Storage)
- [ ] Automatic payment release on photo upload
- [ ] Photo display for contractor

#### PIN Verification (Orders ≥120 JOD)
- [ ] PIN generation (4 digits) on order creation ✅ (Already done in Phase 3)
- [ ] PIN entry interface for supplier
- [ ] PIN validation endpoint
- [ ] Automatic payment release on correct PIN
- [ ] Failed attempt tracking

### 3. **Payment Release Automation**
- [ ] Delivery confirmation triggers payment release
- [ ] Update order status to `completed`
- [ ] Update payment status to `released`
- [ ] Notification to supplier (optional)
- [ ] Transaction record

### 4. **Order Status Flow**
```
confirmed → accepted → in_delivery → delivered → completed
          ↘ rejected
```
- [ ] Status update API endpoint
- [ ] Status transition validation
- [ ] Status history tracking
- [ ] UI status indicators

### 5. **Dispute Reporting** (Basic)
- [ ] "Report Issue" button
- [ ] Issue description form
- [ ] Freeze payment on dispute
- [ ] Set order status to `disputed`
- [ ] Admin notification (basic)

---

## 🗂️ Files to Create

### API Routes
- [ ] `src/app/api/orders/[orderId]/route.ts` - Get single order details
- [ ] `src/app/api/orders/[orderId]/status/route.ts` - Update order status
- [ ] `src/app/api/orders/[orderId]/confirm/route.ts` - Delivery confirmation
- [ ] `src/app/api/orders/[orderId]/dispute/route.ts` - Report dispute

### Pages
- [ ] `src/app/orders/page.tsx` - Orders list
- [ ] `src/app/orders/[orderId]/page.tsx` - Order details
- [ ] `src/app/orders/[orderId]/success/page.tsx` - Order success page

### Components
- [ ] `src/components/OrderCard.tsx` - Order summary card
- [ ] `src/components/OrderStatusBadge.tsx` - Status indicator
- [ ] `src/components/DeliveryTimeline.tsx` - Progress indicator
- [ ] `src/components/PINVerification.tsx` - PIN entry form
- [ ] `src/components/PhotoProofUpload.tsx` - Photo upload
- [ ] `src/components/DisputeForm.tsx` - Issue reporting

### Types
- [ ] `src/types/order.ts` - Update with delivery types

### Utilities
- [ ] `src/lib/utils/orderStatus.ts` - Status transition helpers
- [ ] `src/lib/utils/deliveryConfirmation.ts` - Confirmation logic

---

## 🔄 Implementation Order (MVP-First)

### Phase 4A: Order Tracking (Contractor)
**Priority**: HIGH
**Time**: 2-3 hours
1. Create orders list page
2. Create order details page
3. Display order status and timeline
4. Show delivery information

### Phase 4B: Delivery Confirmation
**Priority**: HIGH
**Time**: 3-4 hours
1. Implement PIN verification endpoint
2. Create PIN entry UI
3. Implement photo upload endpoint
4. Create photo upload UI
5. Connect to payment release

### Phase 4C: Payment Release Automation
**Priority**: HIGH
**Time**: 1-2 hours
1. Create delivery confirmation handler
2. Trigger payment release
3. Update order status to completed
4. Transaction logging

### Phase 4D: Dispute Handling (Basic)
**Priority**: MEDIUM
**Time**: 1-2 hours
1. Create dispute reporting form
2. Freeze payment on dispute
3. Update order status
4. Basic admin notification

---

## 📊 Database Updates Needed

### Tables Already Created ✅
- `orders` - With status, delivery info
- `order_items` - Order line items
- `deliveries` - Delivery tracking, PIN
- `payments` - Payment escrow tracking

### New Fields Needed
```sql
-- deliveries table
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS
  photo_url TEXT, -- Photo proof URL
  photo_uploaded_at TIMESTAMPTZ,
  pin_attempts INTEGER DEFAULT 0,
  pin_verified_at TIMESTAMPTZ;

-- orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT;
```

---

## 🎨 UI Components Structure

### Orders List Page
```
┌─────────────────────────────────────┐
│ My Orders (طلباتي)                  │
├─────────────────────────────────────┤
│ [Active Orders Tab] [Past Orders]   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Order #12345 - مورد الأسمنت     │ │
│ │ Status: In Delivery 🚚           │ │
│ │ 10 bags cement • 145 JOD         │ │
│ │ Expected: Today, Morning         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Order #12344 - مورد الرمل       │ │
│ │ Status: Confirmed ✓              │ │
│ │ 5 m³ sand • 125 JOD              │ │
│ │ Expected: Tomorrow, Afternoon    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Order Details Page
```
┌──────────────────────────────────────┐
│ Order #12345                         │
│ Status: In Delivery 🚚               │
├──────────────────────────────────────┤
│ Delivery Timeline                    │
│ ✓ Confirmed                          │
│ ✓ Accepted by Supplier               │
│ ● In Delivery (Driver on the way)    │
│ ○ Delivered                          │
│ ○ Completed                          │
├──────────────────────────────────────┤
│ Delivery Details                     │
│ Date: Oct 30, 2025                   │
│ Time: Morning (8AM - 12PM)           │
│ Address: شارع الملك عبدالله...      │
│ Phone: 079-555-1234                  │
│                                      │
│ Your Delivery PIN: 1234              │
│ (Share with driver upon delivery)    │
├──────────────────────────────────────┤
│ Order Items                          │
│ • Cement - 10 bags × 4.5 = 45 JOD   │
│ • Rebar - 2 tons × 550 = 1100 JOD   │
│                                      │
│ Subtotal: 1145 JOD                   │
│ Delivery: 15 JOD                     │
│ Total: 1160 JOD ✓ Paid (Escrow)     │
├──────────────────────────────────────┤
│ [Contact Supplier] [Report Issue]   │
└──────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] PIN verification logic
- [ ] Photo upload validation
- [ ] Status transition rules
- [ ] Payment release triggers

### E2E Tests
- [ ] Complete delivery flow with PIN
- [ ] Complete delivery flow with photo
- [ ] Dispute reporting
- [ ] Order status updates

---

## 🚀 Success Criteria

- [ ] Contractors can view all their orders
- [ ] Contractors can track delivery status in real-time
- [ ] Suppliers can confirm delivery with PIN (≥120 JOD orders)
- [ ] Suppliers can upload photo proof (<120 JOD orders)
- [ ] Payment automatically releases after delivery confirmation
- [ ] Contractors can report issues
- [ ] Disputed orders freeze payment
- [ ] All order statuses update correctly
- [ ] UI is fully RTL and bilingual

---

## 📝 Notes

- Start with contractor-facing features (orders list, details)
- Supplier delivery confirmation can come in Phase 5 (Supplier Portal)
- For MVP, we can simulate supplier actions via API calls
- Focus on the happy path first, then edge cases

---

**Next Step**: Start with Phase 4A - Order Tracking (Contractor View)
