# Phase 1 Fixes and Corrections Log

**Date:** November 9, 2025
**Status:** ✅ All Critical Issues Resolved

## Overview

This document tracks all fixes applied to resolve critical production issues with the supplier admin and contractor apps after Phase 1 deployment.

---

## 1. RLS Policy Fixes for Contractor Profiles in JOINs

### Issue
Supplier admins could query contractor profiles directly, but when profiles were accessed via foreign key JOINs (e.g., `orders → profiles`), the RLS policy blocked access, causing contractor names to show as NULL.

### Root Cause
The RLS policy using `is_supplier_admin()` function wasn't being evaluated correctly in JOIN context, causing infinite recursion and blocking profile access.

### Solution
**Migration:** `20251109000002_fix_rls_join_context.sql`

```sql
DROP POLICY IF EXISTS "Supplier admins can view all profiles" ON profiles;

CREATE POLICY "Users can view relevant profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always view their own profile
  id = auth.uid()
  OR
  -- Contractor profiles are visible to everyone authenticated
  -- (This is the KEY fix for the JOIN issue!)
  role = 'contractor'
  OR
  -- Supplier admins can view all profiles
  -- (Uses SECURITY DEFINER function - no recursion)
  is_supplier_admin()
);
```

**Key Change:** Added explicit `role = 'contractor'` condition to allow contractor profiles to be visible in JOINs without triggering the function recursion.

---

## 2. Supplier Admin Order Details Page Fixes

**File:** `/apps/admin/src/app/supplier/orders/[order_id]/page.tsx`

### Issues Fixed

#### 2.1 Table Name Errors
- ❌ `contractor!contractor_id` → ✅ `profiles!contractor_id`
- ❌ `product!product_id` → ✅ `products!product_id`

#### 2.2 Field Name Mismatches
- ❌ `delivery_date` → ✅ `scheduled_delivery_date`
- ❌ `delivery_time_slot` → ✅ `scheduled_delivery_time`
- ❌ `unit` → ✅ `unit_ar` (products table has `unit_ar` and `unit_en`)

#### 2.3 Null-Safe Numeric Handling
Added nullish coalescing for all `.toFixed()` calls:
```typescript
// Before
{item.total_jod.toFixed(2)}

// After
{(item.total_jod ?? 0).toFixed(2)}
```

**Files Changed:**
- Lines 28-52: Fixed query field names
- Lines 205+: Fixed null-safe handling for numeric fields

---

## 3. Contractor Orders List Fixes

**File:** `/apps/web/src/app/orders/page.tsx`

### Issues Fixed

#### 3.1 Missing Order Statuses
Added missing statuses that were being filtered out:
- Added `'pending'` to OrderStatus type
- Added `'cancelled'` to OrderStatus type

#### 3.2 Filter Logic Updates
```typescript
// Active orders filter - added 'pending'
const activeOrders = orders.filter(order =>
  ['pending', 'confirmed', 'accepted', 'in_delivery', 'delivered'].includes(order.status)
)

// Past orders filter - added 'cancelled'
const pastOrders = orders.filter(order =>
  ['completed', 'rejected', 'disputed', 'cancelled'].includes(order.status)
)
```

#### 3.3 Status Badge Configurations
Added badge configs for:
- `pending`: Gray background, "قيد الانتظار"
- `cancelled`: Gray background, "ملغي"

#### 3.4 Payment Status Labels
Added `'held'` payment status label: "محجوز في الضمان"

**Result:** Orders list now shows all 5 orders instead of just 1.

---

## 4. Contractor Order Details Page Fixes

**File:** `/apps/web/src/app/orders/[orderId]/page.tsx`

### Issues Fixed

#### 4.1 React Error #438 - use() Hook Issue
**Problem:** Production build failed with React error #438 when using `use()` hook for params.

**Fix:**
```typescript
// Before
import { use, useEffect, useState } from 'react'
interface OrderDetailsPageProps {
  params: Promise<{ orderId: string }>
}
const resolvedParams = use(params)

// After
import { useEffect, useState } from 'react'
interface OrderDetailsPageProps {
  params: { orderId: string }
}
// Direct access: params.orderId
```

#### 4.2 Query Column Name Corrections

All query fixes applied:

```typescript
// Orders table
❌ order_id → ✅ id
❌ delivery_date → ✅ scheduled_delivery_date
❌ delivery_time_slot → ✅ scheduled_delivery_time

// Suppliers table
❌ supplier_id → ✅ id

// Order Items table
❌ order_item_id → ✅ item_id
❌ subtotal_jod → ✅ total_jod

// Products table (in order_items join)
❌ product_name → ✅ name_ar
❌ product_name_en → ✅ name_en
❌ unit → ✅ unit_ar

// Payments table
❌ transaction_id → ✅ payment_intent_id
```

#### 4.3 Removed !inner Joins
Changed all `!inner` joins to regular joins to prevent filtering out pending orders:
```typescript
// Before
suppliers!inner (...)
deliveries!inner (...)
payments!inner (...)

// After
suppliers (...)
deliveries (...)
payments (...)
```

**Why:** Pending orders don't have `deliveries` or `payments` records yet. `!inner` joins filter them out.

#### 4.4 Nullable Delivery and Payment Data
Made delivery and payment optional:
```typescript
interface OrderDetails {
  delivery: { ... } | null  // Pending orders may not have delivery
  payment: { ... } | null   // Pending orders may not have payment
  // ...
}
```

Wrapped UI sections with null checks:
```typescript
{order.delivery && (
  <div>Delivery Details...</div>
)}

{order.payment && (
  <div>Payment Information...</div>
)}
```

#### 4.5 TypeScript Interface Updates
```typescript
interface OrderItem {
  item_id: string              // was: order_item_id
  quantity: number
  unit_price_jod: number
  total_jod: number            // was: subtotal_jod
  product: {
    name_ar: string            // was: product_name
    name_en: string            // was: product_name_en
    unit_ar: string            // was: unit
  }
}
```

#### 4.6 Timeline and Status Updates
Added 'pending' step to delivery timeline:
```typescript
const steps = [
  { key: 'pending', label: 'قيد الانتظار', icon: '⏳' },
  { key: 'confirmed', label: 'تم تأكيد الطلب', icon: '✓' },
  // ... rest of steps
]
```

---

## 5. Database Schema Summary (Actual Column Names)

### Orders Table
```sql
id                        UUID PRIMARY KEY
order_number              TEXT
status                    order_status
total_jod                 NUMERIC(10,2)
scheduled_delivery_date   DATE
scheduled_delivery_time   TEXT (morning/afternoon/evening)
delivery_fee_jod          NUMERIC(10,2)
contractor_id             UUID → profiles(id)
supplier_id               UUID → suppliers(id)
created_at                TIMESTAMPTZ
```

### Order Items Table
```sql
item_id          UUID PRIMARY KEY    -- NOT order_item_id!
order_id         UUID → orders(id)
product_id       UUID
quantity         NUMERIC(10,2)
unit_price_jod   NUMERIC(10,2)
total_jod        NUMERIC(10,2)       -- NOT subtotal_jod!
created_at       TIMESTAMPTZ
```

### Products Table
```sql
id          UUID PRIMARY KEY
name_ar     TEXT                     -- NOT product_name!
name_en     TEXT                     -- NOT product_name_en!
unit_ar     TEXT                     -- NOT unit!
unit_en     TEXT
price_jod   NUMERIC(10,2)
```

### Payments Table
```sql
id                  UUID PRIMARY KEY
order_id            UUID → orders(id)
payment_intent_id   TEXT              -- NOT transaction_id!
status              payment_status
amount_jod          NUMERIC(10,2)
created_at          TIMESTAMPTZ
```

### Deliveries Table
```sql
delivery_id          UUID PRIMARY KEY
order_id             UUID → orders(id)
delivery_pin         TEXT
scheduled_date       DATE
scheduled_time_slot  TEXT
address_line         TEXT
neighborhood         TEXT
city                 TEXT
building_number      TEXT
floor_number         TEXT
apartment_number     TEXT
phone                TEXT
```

---

## 6. Order Status Flow

```
pending → confirmed → accepted → in_delivery → delivered → completed
                                                    ↓
                                              rejected/disputed/cancelled
```

**Active Orders:** `pending`, `confirmed`, `accepted`, `in_delivery`, `delivered`
**Past Orders:** `completed`, `rejected`, `disputed`, `cancelled`

---

## 7. Payment Status Values

- `pending` - قيد الانتظار
- `held` - محجوز في الضمان
- `escrow_held` - محجوز في الضمان
- `released` - تم التحويل
- `refunded` - مسترد
- `failed` - فشل

---

## 8. Git Commit History

```bash
a9ebb9d - fix: contractor orders list and details page
f365869 - fix: remove use() hook causing React error #438
dce584b - fix: use payment_intent_id instead of transaction_id
367d354 - fix: use item_id and total_jod for order_items
```

---

## 9. Test Accounts

**Password for all:** `TestPassword123!`

### Contractors
- `contractor1@test.jo`
- `contractor2@test.jo`
- `contractor3@test.jo`

### Suppliers
- `ahmad@almawad.jo` (Al Mawad Trading)
- `mohammad@bina.jo` (Bina Construction Supplies)
- `khaled@tijara.jo` (Tijara Building Materials)

---

## 10. Deployment URLs

**Admin App:** https://contractors-mall-admin.vercel.app
**Contractor App:** https://contractors-mall-web.vercel.app

---

## 11. Lessons Learned

### Schema Consistency
- **Always verify actual database column names** before writing queries
- Database migrations may use different naming than what code expects
- Use database inspection tools or check migration files first

### RLS Policies and JOINs
- RLS policies with function calls may not evaluate correctly in JOIN context
- Adding explicit conditions (like `role = 'contractor'`) can fix JOIN visibility
- Avoid recursive policy checks

### Next.js App Router
- `use()` hook for params may not work in production builds
- Direct params access (`params.orderId`) is more reliable for client components
- Always test production builds, not just dev mode

### Supabase Query Patterns
- `!inner` joins filter out NULL results - avoid for optional relations
- Pending records may not have related records (deliveries, payments)
- Always handle nullable foreign key data gracefully

### Column Naming
Common mistakes:
- `id` vs `{table}_id` (e.g., `id` not `order_id` in orders table)
- Localized columns: `name_ar`/`name_en` not `product_name`
- Unit columns: `unit_ar`/`unit_en` not `unit`
- Payment: `payment_intent_id` not `transaction_id`

---

## 12. Current System Status

✅ **Fully Operational**

- ✅ Supplier admin can view all orders with contractor names
- ✅ Supplier admin can view order details
- ✅ Contractor can see all 5 orders (including pending)
- ✅ Contractor can view order details for any status
- ✅ RLS policies working correctly in JOIN context
- ✅ No React errors in production
- ✅ All column names matching database schema

---

## 13. Next Steps (Phase 2)

Based on `CLAUDE.md`, upcoming enhancements:

### Phase 2A: Enhanced Supplier Dashboard
- Analytics dashboard (30-day trends, top products)
- Quick actions panel
- Revenue projections

### Phase 2B: Advanced Product Management
- CSV import/export
- Bulk operations
- Multiple product images
- Rich text editor for descriptions

### Phase 2C: Order & Customer Management
- Order timeline/activity log
- Internal notes system
- Customer insights and profiles

### Phase 2D: Communication & Notifications
- In-app messaging
- Email notifications
- Low stock alerts

---

**Last Updated:** November 9, 2025
**Maintained By:** Claude Code
