# Contractors Mall - Technical Memory

**Last Updated**: November 8, 2025
**Purpose**: Single source of truth for technical decisions, actual implementation, and current state
**Audience**: Claude Code AI, future developers, technical stakeholders

---

## Table of Contents

1. [Current Architecture Overview](#1-current-architecture-overview)
2. [Database Schema (As-Is)](#2-database-schema-as-is)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Implemented Features](#4-implemented-features)
5. [Applied Hotfixes & Schema Changes](#5-applied-hotfixes--schema-changes)
6. [Known Issues & Workarounds](#6-known-issues--workarounds)
7. [Environment & Configuration](#7-environment--configuration)
8. [Development Guidelines](#8-development-guidelines)
9. [API Reference (Actual Endpoints)](#9-api-reference-actual-endpoints)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment & CI/CD](#11-deployment--cicd)
12. [Common Patterns & Code Examples](#12-common-patterns--code-examples)

---

## 1. Current Architecture Overview

### Tech Stack (Actual Versions)

```yaml
Framework: Next.js 14.2.33 (App Router)
Language: TypeScript (strict mode)
Database: Supabase (PostgreSQL + PostGIS)
Authentication: Supabase Auth (email + magic links)
UI Framework: Tailwind CSS
Monorepo: Turborepo v2.5.8
Package Manager: pnpm v9.0.0
Error Monitoring: Sentry (@sentry/nextjs v10.23.0)
Testing: Jest + React Testing Library + Playwright
Deployment: Vercel (auto-deploy from GitHub)
```

### Monorepo Structure

```
contractors-mall/
├── apps/
│   ├── web/                    # Contractor-facing web app (port 3000)
│   └── admin/                  # Admin & Supplier portal (port 3001)
├── packages/
│   ├── ui/                     # Shared UI components (NOT USED YET)
│   └── config/                 # Shared configs (NOT USED YET)
├── supabase/
│   ├── migrations/             # Database migrations (source of truth)
│   ├── seed.sql                # Initial data seeding
│   └── tests/                  # RLS policy tests
├── scripts/                    # Utility scripts
└── .archive/
    └── hotfixes/               # Applied emergency fixes
```

**Important Note**: The `packages/ui` and `packages/config` directories exist but are not currently used. All code is self-contained in `apps/web` and `apps/admin`.

### Deployment Configuration

- **Web App**: `contractors-mall-web.vercel.app`
- **Admin Portal**: `contractors-mall-admin.vercel.app`
- **Vercel Projects**: 2 separate projects, both auto-deploy from `main` branch
- **Build Command**: `pnpm build --filter=@contractors-mall/web` or `--filter=@contractors-mall/admin`
- **Environment Variables**: Stored in Vercel dashboard + `.env.local` for local dev

---

## 2. Database Schema (As-Is)

### ⚠️ CRITICAL: Schema Deviations from Documentation

The actual database schema differs from `docs/DATA_MODEL.md` due to applied hotfixes. **ALWAYS refer to the latest migrations**, not the documentation!

### Current Schema Changes (Post-Hotfixes)

#### 1. `supplier_zone_fees` table

**REMOVED COLUMN**:
- ❌ `vehicle_class_id` - No longer exists! Don't query this.

**Current Structure**:
```sql
CREATE TABLE supplier_zone_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  zone delivery_zone NOT NULL, -- 'zone_a' or 'zone_b'
  base_fee_jod NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, zone) -- One fee per zone per supplier
);
```

**Why**: The original schema had vehicle fees per zone, but the business logic changed to have a single fee per zone regardless of vehicle. Suppliers now handle logistics internally.

#### 2. `orders` table

**NULLABLE COLUMNS**:
- `vehicle_class_id` - Now nullable (was NOT NULL)
- `vehicle_type` - Now nullable

**Why**: Orders no longer auto-select vehicles. Suppliers handle their own logistics.

#### 3. `order_items` table

**TEMPORARILY NULLABLE** (IMPORTANT!):
- `product_name` - Should be NOT NULL but currently nullable
- `unit` - Should be NOT NULL but currently nullable

**Why**: Frontend checkout flow needs to be updated to pass these fields. Once fixed, these should be made NOT NULL again.

**Action Required**:
```sql
-- After fixing frontend, run:
ALTER TABLE order_items ALTER COLUMN product_name SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN unit SET NOT NULL;
```

### Core Tables (Actual Schema)

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  role user_role NOT NULL, -- 'contractor' | 'supplier_admin' | 'driver' | 'admin'
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  preferred_language TEXT DEFAULT 'ar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Users can view their own profile
- Users can update their own profile
- Admins can view all profiles
- Service role has full access

#### `suppliers`
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  business_name TEXT NOT NULL,
  business_name_en TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  radius_km_zone_a NUMERIC DEFAULT 10,
  radius_km_zone_b NUMERIC DEFAULT 25,
  is_verified BOOLEAN DEFAULT false,
  wallet_balance NUMERIC DEFAULT 0,
  rating_average NUMERIC DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Public can view verified suppliers
- Supplier admins can view/update their own supplier
- Admins can view/update all suppliers

#### `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  contractor_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status order_status NOT NULL DEFAULT 'pending',
  subtotal_jod NUMERIC NOT NULL,
  delivery_fee_jod NUMERIC NOT NULL,
  total_jod NUMERIC NOT NULL,
  vehicle_class_id UUID REFERENCES vehicles(id), -- NULLABLE!
  vehicle_type TEXT, -- NULLABLE!
  delivery_zone delivery_zone NOT NULL,
  scheduled_delivery_date DATE NOT NULL,
  scheduled_delivery_time TEXT,
  delivery_address TEXT NOT NULL,
  delivery_latitude NUMERIC NOT NULL,
  delivery_longitude NUMERIC NOT NULL,
  special_requests TEXT,
  contact_phone TEXT,
  rejection_reason TEXT,
  disputed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Order Status Enum**:
```sql
CREATE TYPE order_status AS ENUM (
  'pending',      -- Initial state
  'confirmed',    -- Payment confirmed
  'accepted',     -- Supplier accepted
  'in_delivery',  -- Out for delivery
  'delivered',    -- Delivered (awaiting proof)
  'completed',    -- Proof verified, payment released
  'cancelled',    -- Cancelled by user/supplier
  'rejected',     -- Supplier rejected
  'disputed'      -- Contractor reported issue
);
```

**RLS Policies** (Fixed - No Circular Dependencies!):
- Contractors can view/create their own orders
- Suppliers can view orders for their business
- Drivers can view orders in delivery phase ('in_delivery', 'delivered', 'completed')
- Admins can view all orders

#### `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT, -- TEMPORARILY NULLABLE!
  unit TEXT, -- TEMPORARILY NULLABLE!
  quantity NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies** (Comprehensive!):
- Contractors can create/view order items for their orders
- Suppliers can view/update order items for their orders
- Admins can view/update all order items
- Service role has full access

### Database Functions (Custom)

#### `fn_calculate_delivery_fee(p_supplier_id, p_delivery_lat, p_delivery_lng)`

**Purpose**: Calculate delivery zone and fee based on distance

**Returns**:
```sql
TABLE (
  zone delivery_zone,
  delivery_fee_jod NUMERIC,
  distance_km NUMERIC
)
```

**Logic**:
1. Get supplier location and zone radii
2. Calculate distance using PostGIS `ST_Distance`
3. Determine zone (A or B) based on distance
4. Look up fee from `supplier_zone_fees` table
5. Raise exception if outside service area

**Important**: This function has been fixed for column ambiguity issues. Column names are now properly qualified.

---

## 3. Authentication & Authorization

### How Auth Actually Works

**Provider**: Supabase Auth (NOT phone OTP as originally planned)

**Current Implementation**:
- Email + magic link authentication
- Email verification system with banners
- Role-based access control (RBAC)
- Profile auto-creation on signup

### Auth Flow (Actual)

```mermaid
sequenceDiagram
    User->>Supabase Auth: Sign up with email
    Supabase Auth->>User: Send magic link email
    User->>Supabase Auth: Click magic link
    Supabase Auth->>App: Redirect to /auth/callback
    App->>Database: Check if profile exists
    alt Profile exists
        App->>User: Redirect to dashboard
    else No profile
        App->>User: Redirect to /auth/complete-profile
        User->>App: Fill profile form
        App->>Database: Create profile with role
        App->>User: Redirect to dashboard
    end
```

### Role-Based Access

#### Roles (Enum)
```typescript
type UserRole = 'contractor' | 'supplier_admin' | 'driver' | 'admin';
```

#### Access Matrix

| Feature | Contractor | Supplier Admin | Driver | Admin |
|---------|-----------|----------------|--------|-------|
| Browse products | ✅ | ✅ | ❌ | ✅ |
| Create orders | ✅ | ❌ | ❌ | ✅ |
| Manage products | ❌ | ✅ | ❌ | ✅ |
| Confirm deliveries | ❌ | ❌ | ✅ | ✅ |
| View all orders | ❌ | Own orders | Assigned | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |

### Email Verification

**Status**: Implemented but not enforced

**Components**:
- Email verification banner in web app
- `email_verified` boolean in profiles table
- `email_verified_at` timestamp
- Verification emails sent automatically by Supabase

**Current Behavior**:
- Users can use the app without verifying email
- Banner shows until verified
- No features blocked

**Future Enhancement**: Could enforce verification for certain actions

### Supabase Client Usage

**Server Components** (apps/web/src/lib/supabase/server.ts):
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
    }
  );
}
```

**Client Components** (apps/web/src/lib/supabase/client.ts):
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**IMPORTANT**: Always use `await createClient()` in server components. The function is async!

---

## 4. Implemented Features

### Phase 1: Core MVP (✅ Complete)

#### Contractor Web App (`apps/web`)

**Pages**:
- `/` - Homepage (redirects to /suppliers)
- `/auth/login` - Login page
- `/auth/register` - Registration
- `/auth/complete-profile` - Profile completion after signup
- `/suppliers` - Browse suppliers with map toggle
- `/products` - Browse products by category
- `/checkout/address` - Enter delivery address
- `/checkout/schedule` - Select delivery date/time
- `/checkout/review` - Review order before payment
- `/orders` - View order history
- `/orders/[orderId]` - Order details
- `/orders/[orderId]/success` - Order confirmation
- `/dashboard` - User dashboard

**API Routes**:
- `/api/suppliers` - Get verified suppliers
- `/api/products` - Get products with filters
- `/api/categories` - Get product categories
- `/api/vehicle-estimate` - Calculate delivery fee
- `/api/orders` - Create order (POST)
- `/api/orders/[orderId]/upload-proof` - Upload delivery photo
- `/api/orders/[orderId]/verify-pin` - Verify delivery PIN
- `/api/orders/[orderId]/dispute` - Report issue
- `/api/seed-all` - Seed test data (dev only)
- `/api/seed-orders` - Seed test orders (dev only)

#### Admin & Supplier Portal (`apps/admin`)

**Supplier Portal** (`/supplier/*`):
- `/supplier/dashboard` - Sales metrics and analytics
- `/supplier/products` - Product catalog management
- `/supplier/products/new` - Add new product
- `/supplier/products/[id]/edit` - Edit product
- `/supplier/orders` - View and manage orders
- `/supplier/orders/[id]` - Order details with fulfillment
- `/supplier/deliveries` - Delivery tracking
- `/supplier/deliveries/[id]` - Delivery confirmation (photo/PIN)
- `/supplier/customers` - Customer insights
- `/supplier/customers/[id]` - Customer details
- `/supplier/settings/tags` - Manage order tags
- `/supplier/settings/notifications` - Notification preferences

**Admin Portal** (`/admin/*`):
- `/admin/dashboard` - Platform overview
- `/admin/orders` - All orders management (Phase 1.1)
- `/admin/orders/[id]` - Order details with edit/cancel (Phase 1.1)
- `/admin/users` - User management (Phase 1.1)
- `/admin/users/[id]` - User details (Phase 1.1)
- `/admin/suppliers` - Supplier verification
- `/admin/suppliers/[id]` - Supplier details
- `/admin/payments` - Escrow payment management
- `/admin/payments/escrow` - Manual release/refund
- `/admin/disputes` - Dispute resolution workflow
- `/admin/disputes/[id]` - Dispute details with QC actions
- `/admin/health` - Database health monitoring
- `/admin/settings` - Platform settings
- `/admin/settings/thresholds` - Photo/PIN/site-visit thresholds
- `/admin/settings/vehicles` - Vehicle specs management

**Supplier API Routes**:
- `/api/supplier/products/export` - Export products to CSV
- `/api/supplier/products/import` - Import products from CSV
- `/api/supplier/products/bulk-update` - Batch update products
- `/api/supplier/products/[id]/duplicate` - Duplicate product
- `/api/supplier/tags` - Manage order tags
- `/api/supplier/messages/unread` - Get unread messages count
- (More Phase 2 APIs)

### Phase 1.1: Super Admin Back Office (✅ Complete - Nov 8, 2025)

**New Features**:
1. **Orders Management**:
   - Edit order details (address, date, contact)
   - Change order status
   - Cancel orders with reason
   - Internal notes with audit logging

2. **Users Management**:
   - View all users with role filtering
   - Search by name/email/phone
   - User details with activity history
   - Quick access to user's orders

3. **Audit Logging**:
   - All admin actions logged to `order_notes` with `is_internal: true`
   - Timestamps and admin user ID tracked
   - Visible in order details

**Implementation Details**:
- Built with Server Components for data fetching
- Client Components for interactive forms
- Automatic audit logging in EditOrderForm, CancelOrderButton, ChangeOrderStatusForm
- Real-time page refresh after actions

### Phase 2A-2D: Shopify-Inspired Enhancements (Partially Complete)

**Implemented**:
- Enhanced supplier dashboard with analytics
- Product management improvements
- Contractor insights tracking
- In-app messaging (backend only)
- Order notes and tags
- Notification preferences

**Not Yet Implemented**:
- Bulk operations UI
- CSV import/export UI
- Rich text editor
- Mobile PWA features
- Real-time chat UI

---

## 5. Applied Hotfixes & Schema Changes

### Critical Fixes Applied (November 6-8, 2025)

All hotfixes have been consolidated into migration `20251108100000_apply_all_pending_hotfixes.sql`.

#### 1. RLS Infinite Recursion (CRITICAL)

**Problem**: Circular dependency between `orders` and `deliveries` tables causing complete application breakdown.

**Fix**:
- Simplified driver policy to check role only, not delivery records
- Fixed policy: `Drivers can view assigned orders` now checks `profiles.role = 'driver'` AND status is in delivery phase

**Before**:
```sql
-- ❌ Circular dependency!
CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.order_id = orders.id  -- Queries deliveries
      AND deliveries.driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view deliveries" ON deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = deliveries.order_id  -- Queries orders back!
    )
  );
```

**After**:
```sql
-- ✅ No circular dependency
CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
    AND status IN ('in_delivery', 'delivered', 'completed')
  );
```

#### 2. Missing `order_items` RLS Policies (CRITICAL)

**Problem**: No RLS policies on `order_items` table, preventing order creation.

**Fix**: Added 7 comprehensive policies:
1. Contractors can create order items for their orders
2. Contractors can view their order items
3. Suppliers can view order items for their orders
4. Suppliers can update order items
5. Admins can view all order items
6. Admins can update all order items
7. Service role full access

#### 3. Nullable `order_items` Fields (TEMPORARY FIX)

**Problem**: Frontend not passing `product_name` and `unit` fields.

**Fix**: Made fields temporarily nullable.

**⚠️ ACTION REQUIRED**: After frontend fix, revert to NOT NULL:
```sql
ALTER TABLE order_items ALTER COLUMN product_name SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN unit SET NOT NULL;
```

#### 4. Zone Ambiguity in `fn_calculate_delivery_fee`

**Problem**: Column name `zone` was ambiguous in SQL query.

**Fix**: Properly qualified all column names in the function:
```sql
-- BEFORE: Ambiguous
SELECT base_fee_jod
FROM supplier_zone_fees
WHERE supplier_id = p_supplier_id
  AND zone = v_zone;  -- ❌ Ambiguous!

-- AFTER: Qualified
SELECT base_fee_jod
FROM supplier_zone_fees
WHERE supplier_zone_fees.supplier_id = p_supplier_id
  AND supplier_zone_fees.zone = v_zone;  -- ✅ Clear!
```

#### 5. Vehicle Class Removal

**Problem**: TypeScript types expected `supplier_zone_fees` without `vehicle_class_id`, but database had it.

**Fix**:
- Removed `vehicle_class_id` column from `supplier_zone_fees`
- Removed foreign key constraint
- Made `vehicle_class_id` nullable in `orders` table
- Added unique constraint on `(supplier_id, zone)`

### Archived Hotfixes

Location: `.archive/hotfixes/`

All individual hotfix files have been archived:
1. `HOTFIX_RLS_INFINITE_RECURSION.sql`
2. `HOTFIX_ORDER_ITEMS_RLS.sql`
3. `HOTFIX_ORDER_ITEMS_NULLABLE.sql`
4. `HOTFIX_ZONE_AMBIGUITY.sql`
5. `HOTFIX_VEHICLE_CLASS_REMOVAL.sql`
6. `HOTFIX_COMPLETE_ORDER_SUBMISSION.sql`
7. `HOTFIX_ORDER_ITEMS_ALL_NULLABLE.sql`

**These are historical**. The consolidated migration is the source of truth.

---

## 6. Known Issues & Workarounds

### 1. Sentry Type Issues (Fixed)

**Issue**: `Sentry.Transaction` type not available in newer Sentry SDK.

**Workaround Applied**:
```typescript
// In apps/web/src/lib/monitoring.ts and apps/admin/src/lib/monitoring.ts

// Instead of:
// export function startTransaction(name: string, op: string): Sentry.Transaction | undefined

// Use:
export function startTransaction(_name: string, _op: string): any {
  return {
    setStatus: () => {},
    finish: () => {},
  };
}

// And for performance tracking:
export async function measurePerformance<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return await Sentry.startSpan({ name, op: operation }, async () => {
    return await fn();
  });
}
```

### 2. RPC Function Types Not Defined

**Issue**: Custom database functions like `get_table_stats()` not in TypeScript types.

**Workaround Applied**:
```typescript
// In apps/admin/src/app/admin/health/page.tsx

// Instead of:
// const { data } = await supabase.rpc('get_table_stats');

// Use type assertion:
const { data } = await (supabase.rpc as any)('get_table_stats');
const { data: rlsHealth } = await (supabase.rpc as any)('check_rls_health');
const { data: perfMetrics } = await (supabase.rpc as any)('get_performance_metrics');
```

**Better Solution (Future)**: Generate types from Supabase schema:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### 3. `system_logs` Table May Not Exist

**Issue**: Health monitoring queries `system_logs` table that might not exist in all environments.

**Workaround Applied**:
```typescript
const { data: recentErrors } = await (supabase as any)
  .from('system_logs')
  .select('*')
  .eq('level', 'error')
  .order('created_at', { ascending: false })
  .limit(10);
```

**Solution**: Run health monitoring migration:
```bash
npx supabase db push
# Or manually apply: supabase/migrations/20251108200000_health_monitoring_functions.sql
```

### 4. Frontend Not Passing Product Data

**Issue**: Checkout flow doesn't pass `product_name` and `unit` to `order_items`.

**Current Status**: Fields are nullable to allow order creation.

**TODO**: Update checkout to include:
```typescript
{
  product_id: product.id,
  product_name: product.name_ar,  // ADD THIS
  unit: product.unit_ar,           // ADD THIS
  quantity: item.quantity,
  price_per_unit: product.price_per_unit,
  subtotal: item.quantity * product.price_per_unit
}
```

### 5. Vehicle Auto-Selection Disabled

**Issue**: Original PRD specified auto vehicle selection, but it's been disabled.

**Current Behavior**:
- `vehicle_class_id` and `vehicle_type` set to `null` in orders
- Suppliers handle logistics internally
- Delivery fee based only on zone (A or B)

**Why**: Simplified the MVP scope. Vehicle logic may return in Phase 2.

---

## 7. Environment & Configuration

### Required Environment Variables

#### Both Apps (Web & Admin)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Sentry (Optional but Recommended)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=contractors-mall

# Vercel (Auto-set in production)
NEXT_PUBLIC_VERCEL_ENV=production|preview|development
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=auto-set
```

#### Local Development Only

```bash
# Database (if using local Supabase)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Vercel Configuration

**Root** (`vercel.json`):
```json
{
  "buildCommand": "echo 'Root build command - handled by sub-projects'",
  "outputDirectory": ".next",
  "devCommand": "pnpm dev",
  "framework": "nextjs"
}
```

**Web App** (`apps/web/vercel.json`):
```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=@contractors-mall/web",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**Admin App** (`apps/admin/vercel.json`):
```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=@contractors-mall/admin",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### Supabase Project Setup

**URL Format**: `https://your-project-id.supabase.co`

**Required Settings**:
1. Enable PostGIS extension
2. Enable Email provider (disable phone for now)
3. Set site URL: `http://localhost:3000` (dev) or production URL
4. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3001/auth/callback`
   - `https://your-web-domain.vercel.app/auth/callback`
   - `https://your-admin-domain.vercel.app/auth/callback`

**Database Backups**: Enabled (automatic daily backups on paid plan)

**Storage Buckets**:
- `delivery-proofs` - For delivery confirmation photos
- `product-images` - For product photos
- `supplier-logos` - For supplier business logos

---

## 8. Development Guidelines

### Database Migrations

**Source of Truth**: `supabase/migrations/` folder

**DO**:
✅ Always create migrations for schema changes
✅ Use timestamps: `YYYYMMDDHHMMSS_description.sql`
✅ Include rollback comments
✅ Test locally before pushing
✅ Apply in order (oldest first)

**DON'T**:
❌ Edit existing migrations
❌ Manually alter production database
❌ Skip migrations
❌ Create migrations without testing

**Migration Pattern**:
```sql
-- ============================================================================
-- MIGRATION: Description of what this does
-- ============================================================================
-- Date: YYYY-MM-DD
-- Author: Your Name
-- Purpose: Why this change is needed
-- ============================================================================

-- Apply changes
ALTER TABLE example ADD COLUMN new_field TEXT;

-- Add indexes if needed
CREATE INDEX idx_example_new_field ON example(new_field);

-- Update RLS policies if needed
DROP POLICY IF EXISTS "old_policy" ON example;
CREATE POLICY "new_policy" ON example FOR SELECT USING (true);

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END $$;
```

### Adding New Features

**Process**:
1. **Plan**: Write down what tables/endpoints/pages you need
2. **Schema**: Create migration if database changes needed
3. **Backend**: Implement API routes (test with curl/Postman)
4. **Frontend**: Build UI components
5. **RLS**: Add/update policies as needed
6. **Test**: Write tests for critical paths
7. **Document**: Update this file if significant

**Example: Adding a "Favorites" Feature**

```sql
-- 1. Migration: 20251109100000_add_favorites.sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_id, supplier_id)
);

-- RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can manage their favorites" ON favorites
  FOR ALL USING (contractor_id = auth.uid());
```

```typescript
// 2. API Route: apps/web/src/app/api/favorites/route.ts
export async function POST(request: Request) {
  const supabase = await createClient();
  const { supplier_id } = await request.json();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('favorites')
    .insert({ contractor_id: user.id, supplier_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
```

```typescript
// 3. Client Component: components/FavoriteButton.tsx
'use client';

export function FavoriteButton({ supplierId }: { supplierId: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = async () => {
    const res = await fetch('/api/favorites', {
      method: isFavorite ? 'DELETE' : 'POST',
      body: JSON.stringify({ supplier_id: supplierId }),
    });

    if (res.ok) {
      setIsFavorite(!isFavorite);
    }
  };

  return (
    <button onClick={toggleFavorite}>
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}
```

### Common Patterns

#### Server-Side Data Fetching
```typescript
// In app/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('some_field', 'value');

  if (error) {
    console.error('Error fetching data:', error);
    return <div>Error loading data</div>;
  }

  return <div>{/* Render data */}</div>;
}
```

#### Client-Side Mutations
```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function MyForm() {
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (formData: FormData) => {
    const { error } = await supabase
      .from('table_name')
      .insert({ /* data */ });

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    router.refresh(); // Refresh server components
    router.push('/success');
  };

  return <form action={handleSubmit}>...</form>;
}
```

---

## 9. API Reference (Actual Endpoints)

### Web App APIs (`apps/web/src/app/api`)

#### `GET /api/suppliers`

**Query Params**:
- `search` (optional): Search by business name
- `latitude` (optional): User location
- `longitude` (optional): User location
- `maxDistance` (optional): Max distance in km

**Response**:
```json
{
  "suppliers": [
    {
      "id": "uuid",
      "business_name": "محل الإنشاءات",
      "business_name_en": "Construction Store",
      "latitude": 31.963158,
      "longitude": 35.930359,
      "radius_km_zone_a": 10,
      "radius_km_zone_b": 25,
      "is_verified": true,
      "rating_average": 4.5,
      "distance": 5.2,  // Only if lat/lng provided
      "delivery_zone": "zone_a",  // Only if lat/lng provided
      "supplier_zone_fees": [
        { "zone": "zone_a", "base_fee_jod": 5 },
        { "zone": "zone_b", "base_fee_jod": 10 }
      ]
    }
  ],
  "count": 1
}
```

#### `POST /api/orders`

**Request Body**:
```json
{
  "supplier_id": "uuid",
  "delivery_address": {
    "address": "Amman, Jordan",
    "latitude": 31.963158,
    "longitude": 35.930359
  },
  "scheduled_delivery_date": "2025-11-10",
  "scheduled_delivery_time": "morning",
  "contact_phone": "+962791234567",
  "special_requests": "Please call before delivery",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 10,
      "price_per_unit": 5.5
    }
  ]
}
```

**Response**:
```json
{
  "order": {
    "id": "uuid",
    "order_number": "ORD-20251108-00001",
    "status": "pending",
    "total_jod": 65.5,
    "delivery_fee_jod": 10,
    "subtotal_jod": 55,
    "delivery_zone": "zone_b"
  }
}
```

#### `POST /api/orders/[orderId]/upload-proof`

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `photo`: File (JPEG/PNG, max 5MB)

**Response**:
```json
{
  "success": true,
  "delivery": {
    "id": "uuid",
    "proof_photo_url": "https://..."
  }
}
```

#### `POST /api/orders/[orderId]/verify-pin`

**Request Body**:
```json
{
  "pin": "1234"
}
```

**Response**:
```json
{
  "success": true,
  "message": "تم التحقق من رمز PIN بنجاح"
}
```

### Admin/Supplier APIs (`apps/admin/src/app/api`)

#### `GET /api/supplier/products/export`

**Response**: CSV file download

**Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=products-2025-11-08.csv
```

#### `POST /api/supplier/products/bulk-update`

**Request Body**:
```json
{
  "product_ids": ["uuid1", "uuid2"],
  "updates": {
    "price_per_unit": 10.5,
    "is_available": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "updated_count": 2
}
```

---

## 10. Testing Strategy

### RLS Policy Tests

**Location**: `supabase/tests/`

**Run Command**:
```bash
./scripts/test-rls-policies.sh
```

**Coverage**:
- ✅ RLS enabled on all critical tables
- ✅ Policy count validation
- ✅ Functional tests (9 scenarios)
- ✅ No circular dependency checks

### E2E Tests (Playwright)

**Location**: `apps/web/e2e/`

**Run Command**:
```bash
pnpm test:e2e
```

**Test Suites**:
1. **Order Creation Flow** (`order-creation-flow.spec.ts`)
   - Complete order flow (10 steps)
   - Multi-supplier cart prevention
   - Zone-based delivery fees
   - Out-of-zone handling

2. **Payment & Escrow** (`payment-escrow-flow.spec.ts`)
   - Photo proof (<120 JOD)
   - PIN verification (≥120 JOD)
   - Escrow freeze on dispute
   - Incorrect PIN rejection

3. **Delivery Confirmation** (`delivery-confirmation.spec.ts`)
   - Photo validation
   - File type/size checks
   - PIN format validation
   - Duplicate prevention

### Unit & Integration Tests (Jest)

**Run Command**:
```bash
pnpm test
```

**Coverage Target**: 70%

**Critical Areas**:
- Admin order management (`apps/admin/src/app/supplier/__tests__/orders.test.tsx`)
- Payment management (`apps/admin/src/app/admin/__tests__/payments.test.tsx`)
- Dispute workflow (`apps/admin/src/app/admin/__tests__/disputes.test.tsx`)

---

## 11. Deployment & CI/CD

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main`
- Pull requests to `main`

**Jobs**:
1. **Quality** - ESLint + Prettier
2. **Build** - TypeScript compilation
3. **Test** - Jest + RLS tests (MANDATORY - no bypass!)
4. **Security** - `pnpm audit` + Snyk (optional)
5. **E2E** (PRs only) - Playwright tests
6. **Performance** (PRs only) - Lighthouse CI

**Coverage Enforcement**:
```yaml
- name: Check coverage
  run: |
    pnpm test --coverage
    # Fails if < 70% coverage
```

**Deployment**:
- Auto-deploy to Vercel on push to `main`
- Preview deployments on PRs
- Production: `contractors-mall-web.vercel.app` + `contractors-mall-admin.vercel.app`

### Performance Budgets

**File**: `lighthouse-budget.json`

```json
{
  "LCP": 3000,   // Largest Contentful Paint
  "FCP": 2000,   // First Contentful Paint
  "TBT": 300,    // Total Blocking Time
  "CLS": 0.1     // Cumulative Layout Shift
}
```

**Monitoring**: Lighthouse CI runs on every PR

---

## 12. Common Patterns & Code Examples

### Error Handling with Sentry

```typescript
import { trackError, trackAPIError } from '@/lib/monitoring';

// In API route
try {
  const result = await someOperation();
} catch (error) {
  trackAPIError(
    error as Error,
    '/api/orders',
    'POST',
    500,
    { order_id: orderId }
  );
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// In component
try {
  await submitForm();
} catch (error) {
  trackError(error as Error, 'Form submission', { form: 'order-checkout' });
  setError('حدث خطأ. يرجى المحاولة مرة أخرى');
}
```

### Audit Logging Pattern

```typescript
// When admin performs action on order
const handleOrderEdit = async (updates: Partial<Order>) => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Update order
  await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  // 2. Log the action
  await supabase
    .from('order_notes')
    .insert({
      order_id: orderId,
      note: `تم تعديل تفاصيل الطلب من قبل المسؤول`,
      created_by: user.id,
      is_internal: true  // Admin-only note
    });

  router.refresh();
};
```

### RTL & i18n (Future)

**Current State**: Hardcoded Arabic text, no `next-intl` yet

**Pattern to Follow**:
```typescript
// When implementing i18n:
import { useTranslations } from 'next-intl';

function Component() {
  const t = useTranslations('Orders');

  return (
    <div dir="rtl">  {/* RTL layout */}
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

---

## Summary Checklist

When working on this project, remember:

✅ Database schema has changed - check migrations, not docs
✅ `vehicle_class_id` removed from `supplier_zone_fees`
✅ `order_items.product_name` and `.unit` are temporarily nullable
✅ RLS policies fixed - no circular dependencies
✅ Sentry types need workarounds (`as any` for RPC functions)
✅ Two separate Vercel deployments (web + admin)
✅ Email auth only (no phone OTP yet)
✅ Tests are mandatory in CI - no bypass
✅ Phase 1.1 admin features complete
✅ Stability improvements complete

---

**This document should be updated whenever**:
- Schema changes (new migrations)
- Major features added/removed
- Workarounds discovered
- Deployment configuration changes
- Environment variables added

**Last Updated**: November 8, 2025
**Maintained by**: Claude Code AI
