# Database Naming Conventions

**Last Updated:** 2025-11-10
**Status:** ✅ Enforced

---

## 🎯 Core Principle

This project follows the **industry-standard convention** used by Rails, Django, Laravel, and modern ORMs:

> **Primary keys are named `id`**
> **Foreign keys are named `{table}_id`**

This convention provides the best balance of clarity, conciseness, and tool compatibility.

---

## Primary Keys: Always `id`

Every table's primary key MUST be named `id`.

### ✅ Examples

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  -- ... other columns
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  -- ... other columns
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  -- ... other columns
);
```

### ❌ DON'T Do This

```sql
-- WRONG: Do not name primary keys with table prefix
CREATE TABLE orders (
  order_id UUID PRIMARY KEY,  -- ❌ Should be 'id'
  ...
);
```

---

## Foreign Keys: Always `{table}_id`

Foreign keys MUST be named using the singular table name + `_id`.

### ✅ Examples

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  -- ... other columns
);

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id),
  -- ... other columns
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  -- ... other columns
);
```

### ❌ DON'T Do This

```sql
-- WRONG: Don't use just 'id' for foreign keys
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order UUID NOT NULL,  -- ❌ Should be 'order_id'
  product UUID NOT NULL, -- ❌ Should be 'product_id'
  ...
);
```

---

## Complete Example: Orders System

Here's how our core tables follow this convention:

```sql
-- ORDERS TABLE
CREATE TABLE orders (
  id UUID PRIMARY KEY,              -- ✅ Primary key is 'id'
  order_number TEXT UNIQUE,
  contractor_id UUID NOT NULL,      -- ✅ FK to profiles table
  supplier_id UUID NOT NULL,        -- ✅ FK to suppliers table
  status TEXT DEFAULT 'pending',
  total_jod NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER_ITEMS TABLE
CREATE TABLE order_items (
  id UUID PRIMARY KEY,              -- ✅ Primary key is 'id'
  order_id UUID NOT NULL,           -- ✅ FK to orders table
  product_id UUID NOT NULL,         -- ✅ FK to products table
  quantity NUMERIC(10,2) NOT NULL,
  unit_price_jod NUMERIC(10,2) NOT NULL,
  total_jod NUMERIC(10,2) NOT NULL
);

-- DELIVERIES TABLE
CREATE TABLE deliveries (
  id UUID PRIMARY KEY,              -- ✅ Primary key is 'id'
  order_id UUID UNIQUE NOT NULL,    -- ✅ FK to orders table (one-to-one)
  driver_id UUID,                   -- ✅ FK to profiles table
  delivery_pin TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- PAYMENTS TABLE
CREATE TABLE payments (
  id UUID PRIMARY KEY,              -- ✅ Primary key is 'id'
  order_id UUID UNIQUE NOT NULL,    -- ✅ FK to orders table (one-to-one)
  status TEXT DEFAULT 'pending',
  amount_jod NUMERIC(10,2) NOT NULL,
  held_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);

-- DISPUTES TABLE
CREATE TABLE disputes (
  id UUID PRIMARY KEY,              -- ✅ Primary key is 'id'
  order_id UUID UNIQUE NOT NULL,    -- ✅ FK to orders table
  opened_by UUID NOT NULL,          -- ✅ FK to profiles table
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'opened',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Why This Convention?

### ✅ Pros

1. **Industry Standard**
   - Rails: `belongs_to :order` expects `order_id`
   - Django: `ForeignKey('Order')` creates `order_id`
   - Laravel: Same convention
   - Supabase/Prisma: Optimized for this pattern

2. **Cleaner Code**
   ```typescript
   // Clean and natural
   const { data: order } = await supabase
     .from('orders')
     .select('id, order_number, total_jod')
     .eq('id', orderId)
     .single()
   ```

3. **Clear in Joins**
   ```sql
   SELECT o.id, o.order_number, p.status as payment_status
   FROM orders o
   JOIN payments p ON o.id = p.order_id  -- ✅ Crystal clear
   ```

4. **Type Generation**
   - TypeScript generators work better
   - GraphQL schema generation works better
   - Auto-complete in IDEs is smarter

5. **Less Typing**
   ```typescript
   // vs writing order.order_id everywhere
   order.id  // Much cleaner
   ```

### ❌ Alternative Rejected: All keys as `{table}_id`

We considered naming primary keys as `order_id`, `product_id`, etc., but rejected it because:

- ❌ More verbose: `SELECT order_id FROM orders` (redundant)
- ❌ Against framework conventions
- ❌ Harder migration from standard ORMs
- ❌ More typing for every query
- ❌ Breaks auto-generated code from most tools

---

## Application Code Examples

### TypeScript (Supabase Client)

```typescript
// ✅ CORRECT: Query by 'id'
const { data: order } = await supabase
  .from('orders')
  .select(`
    id,
    order_number,
    contractor_id,
    supplier:suppliers(id, business_name),
    order_items(id, product_id, quantity)
  `)
  .eq('id', orderId)
  .single()

// ✅ CORRECT: Join using table.id = other.table_id
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    payment:payments!order_id(status, amount_jod)
  `)
  .eq('contractor_id', userId)
```

### SQL Queries

```sql
-- ✅ CORRECT: Primary key is 'id'
SELECT id, order_number, total_jod
FROM orders
WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- ✅ CORRECT: Foreign keys are '{table}_id'
SELECT
  o.id,
  o.order_number,
  p.status as payment_status,
  d.delivery_pin
FROM orders o
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN deliveries d ON o.id = d.order_id
WHERE o.contractor_id = '123e4567-e89b-12d3-a456-426614174000';
```

---

## Migration Files

All new migrations MUST follow this convention.

### ✅ Template for New Tables

```sql
-- Create new table following naming convention
CREATE TABLE {table_name} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys: {referenced_table}_id
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Regular columns
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_{table_name}_user ON {table_name}(user_id);
CREATE INDEX idx_{table_name}_order ON {table_name}(order_id);
```

### 🚫 If You See Old Pattern in Migrations

If you encounter old migrations that used `order_id` as a primary key, **do not modify them**. They have been transformed to use `id`. Only ensure **new migrations** follow the standard.

---

## Historical Context

**Why the inconsistency existed:**

Early in the project, some migrations were created with `{table}_id` as primary keys (`order_id`, `payment_id`, etc.). These were later transformed to use `id` via migration `20251031100000_transform_to_new_schema.sql`.

The current database and all application code now use `id` for primary keys.

**Migration timeline:**
1. `20251030100000_create_core_tables.sql` - Created tables with `order_id` as PK
2. `20251031100000_transform_to_new_schema.sql` - Renamed `id` → `order_id` (but this was reversed)
3. **Current state:** All tables use `id` as PK

---

## Validation Checklist

Before committing a new migration or table:

- [ ] Primary key is named `id`
- [ ] All foreign keys are named `{table}_id`
- [ ] References clause points to `{table}(id)`
- [ ] Indexes use the convention: `idx_{table}_{column}`
- [ ] Comments explain any non-standard columns

---

## Tools & Type Generation

### Generate TypeScript Types

```bash
# Regenerate types after schema changes
pnpm supabase gen types typescript --linked > apps/admin/src/types/supabase.ts
pnpm supabase gen types typescript --linked > apps/web/src/types/supabase.ts
```

### Validate Schema

```bash
# Check current schema in production
pnpm supabase db remote commit
```

---

## Summary

| Element | Convention | Example |
|---------|-----------|---------|
| **Primary Key** | `id` | `orders.id` |
| **Foreign Key** | `{table}_id` | `order_items.order_id` |
| **References** | `REFERENCES {table}(id)` | `REFERENCES orders(id)` |
| **Indexes** | `idx_{table}_{column}` | `idx_orders_contractor` |

**This convention is enforced across:**
- ✅ Database schema (all tables)
- ✅ Application code (TypeScript)
- ✅ API contracts
- ✅ Type definitions
- ✅ Documentation

---

## Questions?

If you're unsure about naming:

1. **Ask yourself:** "Am I defining the primary key of this table?"
   - YES → Use `id`
   - NO → Use `{referenced_table}_id`

2. **Check existing tables** in `docs/DATA_MODEL.md`

3. **Ask the team** if introducing a new pattern

---

**Remember:** Consistency > Personal Preference

This convention exists to make the codebase predictable and maintainable. Please follow it strictly.
