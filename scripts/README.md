# Test Data Generation Scripts

## run-comprehensive-test-data.sh (RECOMMENDED)

**Best approach for creating comprehensive test data via pure SQL.**

This bash script runs the comprehensive SQL seed script (`supabase/seed-comprehensive-test-data.sql`) that creates realistic test data covering ALL scenarios for the platform.

### Why Use This Script?

✅ **More reliable** - Pure SQL, no network timeouts
✅ **More comprehensive** - Covers ALL scenarios including disputes, notes, all payment states
✅ **Faster** - Direct SQL inserts
✅ **Easier to troubleshoot** - SQL errors are clearer
✅ **Production-ready** - Can be modified for staging/production seeding

### What It Creates

**7 User Profiles:**
- 3 suppliers (supplier1@contractors.jo, supplier2@contractors.jo, supplier3@contractors.jo)
- 2 contractors (contractor1@test.jo, contractor2@test.jo)
- 1 driver (driver1@test.jo)
- 1 admin (admin@contractors.jo)

**3 Suppliers:**
- مواد البناء الأردنية (Jordan Building Materials)
- المورد الذهبي (Golden Supplier)
- مستودع الإنشاءات (Construction Warehouse)

**3 Contractor Projects:**
- فيلا عبدون (Abdoun Villa)
- مبنى تجاري (Commercial Building)
- مستودع صناعي (Industrial Warehouse)

**12 Products:**
- Cement products (2 items, 1 with low stock ⚠️)
- Steel products (3 items)
- Sand & aggregate (3 items, 1 with low stock ⚠️)
- Bricks & blocks (2 items)
- Tools (2 items)

**15 Orders Covering ALL Statuses:**

| Order # | Status | Amount | Notes | Special |
|---------|--------|--------|-------|---------|
| CM100001 | pending | 50 JOD | ✓ | Small order |
| CM100002 | confirmed | 257 JOD | ✓ | PIN verification |
| CM100003 | confirmed | 96 JOD | ✓ | Photo proof |
| CM100004 | in_delivery | 176 JOD | ✓ | Out for delivery |
| CM100005 | in_delivery | 346 JOD | ✓ | High value |
| CM100006 | delivered | 118 JOD | ✓ | Awaiting photo |
| CM100007 | delivered | 230 JOD | ✓ | Awaiting PIN |
| CM100008 | completed | 225 JOD | ✓ | Reviewed ⭐️ |
| CM100009 | cancelled | 175 JOD | ✓ | Refunded |
| CM100010 | pending | 45 JOD | - | - |
| CM100011 | confirmed | 340 JOD | ✓ | Large order |
| CM100012 | in_delivery | 680 JOD | ✓ | Very high value |
| CM100013 | delivered | 520 JOD | ✓ | Dispute possible |
| CM100014 | completed | 195 JOD | ✓ | Reviewed ⭐️⭐️⭐️⭐️ |
| CM100015 | cancelled | 85 JOD | - | Early cancel |

**3 Disputes:**
- OPENED: Quality issue with high-value tile order (site visit required)
- INVESTIGATING: Delivery timing issue
- RESOLVED: Missing quantity issue (resolved in contractor's favor)

**9 Deliveries:**
- 3 with photo proof (< 120 JOD)
- 6 with PIN verification (≥ 120 JOD)
- All with realistic driver notes

**15 Payments:**
- Pending (new orders)
- Held (delivered orders, disputed orders)
- Released (completed orders)
- Refunded (cancelled orders)

**4 Reviews:**
- Mix of ratings (3★ to 5★)
- Arabic review text

### Prerequisites ⚠️

**IMPORTANT:** Before running this script, you MUST create these auth users via Supabase Dashboard:

Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/auth/users

Click "Add user" → "Create new user" for each:

1. **supplier1@contractors.jo** / TestSupplier123! (Auto Confirm ✓)
2. **supplier2@contractors.jo** / TestSupplier123! (Auto Confirm ✓)
3. **supplier3@contractors.jo** / TestSupplier123! (Auto Confirm ✓)
4. **contractor1@test.jo** / TestPassword123! (Auto Confirm ✓)
5. **contractor2@test.jo** / TestPassword123! (Auto Confirm ✓)
6. **driver1@test.jo** / TestDriver123! (Auto Confirm ✓)
7. **admin@contractors.jo** / TestAdmin123! (Auto Confirm ✓)

**Make sure to check "Auto Confirm User" for each!**

### Usage

```bash
# Option 1: Using pnpm script (RECOMMENDED)
pnpm db:seed-comprehensive

# Option 2: Run script directly
./scripts/run-comprehensive-test-data.sh

# Option 3: Run SQL directly (if you already created auth users)
PGPASSWORD="your-password" psql "your-db-url" -f supabase/seed-comprehensive-test-data.sql
```

The script will:
1. ✅ Check for .env.local file
2. ✅ Show prerequisites checklist
3. ✅ Ask for confirmation that auth users are created
4. ✅ Run the comprehensive SQL script
5. ✅ Show success summary with what was created
6. ✅ Show test account credentials

### What You Can Test After Running

**Supplier Dashboard** (Login: supplier1@contractors.jo)
- ✓ Total Orders: Shows realistic count
- ✓ Pending Orders: Shows confirmed orders
- ✓ Today's Deliveries: Shows in_delivery + delivered
- ✓ Active Products: 4 products
- ✓ Low Stock Alerts: 0 products (all in stock for supplier1)
- ✓ Total Earnings: Shows released payments
- ✓ Recent Orders Table: Shows last 5 orders

**Contractor Portal** (Login: contractor1@test.jo)
- ✓ My Orders: Shows all orders with various statuses
- ✓ Order Details: Notes, items, delivery info
- ✓ Delivery Tracking: Photo proofs and PIN verification
- ✓ Disputes: Can see dispute details
- ✓ Reviews: Can see submitted reviews

**Admin Dashboard** (Login: admin@contractors.jo)
- ✓ Platform Metrics: Total orders, revenue, active users
- ✓ Supplier Management: 3 suppliers listed
- ✓ Order Monitoring: All 15 orders visible
- ✓ Dispute Queue: 3 disputes to manage
- ✓ Payment Management: 15 payments in various states

**Dispute Management**
- ✓ Opened dispute: Quality issue (needs site visit)
- ✓ Investigating: QC team assigned
- ✓ Resolved: Shows resolution notes

**Payment Flows**
- ✓ Pending: New orders
- ✓ Held: Delivered orders (escrow)
- ✓ Released: After delivery confirmation
- ✓ Refunded: Cancelled orders

### Success Output

```
================================================
✅ SUCCESS!
================================================

Comprehensive test data has been created:

✓ 7 User Profiles (3 suppliers, 2 contractors, 1 driver, 1 admin)
✓ 3 Suppliers with realistic business data
✓ 3 Contractor Projects
✓ 12 Products (2 with low stock for alert testing)
✓ 15 Orders in all statuses (pending → completed/cancelled)
✓ 9 Deliveries (photo proof & PIN verification)
✓ 15 Payments (pending, held, released, refunded)
✓ 3 Disputes (opened, investigating, resolved)
✓ 4 Reviews with ratings

You can now test:
1. Supplier Dashboard - Login as supplier1@contractors.jo
2. Contractor Portal - Login as contractor1@test.jo
3. Admin Dashboard - Login as admin@contractors.jo

All dashboards should now show realistic metrics!
```

### Troubleshooting

**Error: "Auth users not created"**
- Create all 7 users via Supabase Dashboard first
- Make sure to check "Auto Confirm User"
- Use the exact emails listed above

**Error: "Database connection failed"**
- Check .env.local has correct credentials
- Verify `SUPABASE_DB_PASSWORD` and `SUPABASE_DB_URL`

**Error: "Schema mismatch"**
- Run migrations first: `pnpm supabase db push`
- Make sure all migrations are applied

**Script asks for confirmation but you haven't created users**
- Press 'n' to abort
- Create auth users via Dashboard
- Run script again

### Related Files

- **SQL Script:** `supabase/seed-comprehensive-test-data.sql`
- **Bash Helper:** `scripts/run-comprehensive-test-data.sh`
- **Documentation:** `TESTING_DASHBOARD_FIX.md`

---

## generate-test-data.mjs (Alternative - Has Schema Issues)

Comprehensive test data generator for the Contractors Mall platform.

### What It Creates

**Suppliers (3):**
- مواد البناء الأردنية (Jordan Building Materials)
- المورد الذهبي (Golden Supplier)
- مستودع الإنشاءات (Construction Warehouse)

Each supplier gets:
- 12 products across 4 categories (Cement, Steel, Sand, Bricks)
- Zone A and Zone B delivery radii
- Verified and active status

**Contractors (2):**
- أحمد محمود (contractor1@test.jo)
- محمد علي (contractor2@test.jo)

**Orders (33 total, 11 per supplier):**

For each supplier, creates orders in ALL statuses:

| Status | Count | Description | Amount Range | Delivery Date |
|--------|-------|-------------|--------------|---------------|
| `pending` | 1 | New, not yet confirmed | ~45 JOD | +2 days |
| `confirmed` | 2 | Waiting supplier acceptance | 85 JOD, 250 JOD | +1 day |
| `accepted` | 1 | Supplier accepted, preparing | 120 JOD | +1 day |
| `in_delivery` | 1 | Out for delivery | 340 JOD | Today |
| `delivered` | 2 | Delivered, awaiting payment | 95 JOD, 450 JOD | Today |
| `completed` | 1 | Payment released | 180 JOD | -3 days |
| `rejected` | 1 | Supplier rejected order | 60 JOD | N/A |
| `disputed` | 1 | Under dispute | 380 JOD | -1 day |
| `cancelled` | 1 | Cancelled by contractor | 75 JOD | N/A |

**Key Testing Scenarios:**

✅ **Photo Proof Orders (< 120 JOD):**
- pending: 45.50 JOD
- confirmed: 85.00 JOD
- delivered: 95.00 JOD
- rejected: 60.00 JOD
- cancelled: 75.00 JOD

✅ **PIN Verification Orders (≥ 120 JOD):**
- confirmed: 250.00 JOD
- accepted: 120.00 JOD
- in_delivery: 340.00 JOD
- delivered: 450.00 JOD
- completed: 180.00 JOD
- disputed: 380.00 JOD

✅ **Delivery Scheduling:**
- Today's deliveries: in_delivery, delivered (2 per supplier)
- Tomorrow's deliveries: confirmed, accepted
- Future deliveries: pending
- Past deliveries: completed, disputed

✅ **Payment States:**
- Pending: pending, confirmed, accepted, in_delivery
- Held: delivered, disputed
- Released: completed
- Refunded: rejected, cancelled

### Usage

```bash
# Make sure you have environment variables set
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the script
pnpm db:generate-test-data
```

Or run directly:

```bash
node scripts/generate-test-data.mjs
```

### What Gets Created

```
✨ Test data generation complete!

📊 Summary:
   - 3 suppliers created
   - 2 contractors created
   - 36 products created
   - 33 orders created across all statuses

🔐 Test Accounts:
   Suppliers:
     - supplier1@contractors.jo / TestSupplier123!
     - supplier2@contractors.jo / TestSupplier123!
     - supplier3@contractors.jo / TestSupplier123!
   Contractors:
     - contractor1@test.jo / TestPassword123!
     - contractor2@test.jo / TestPassword123!
```

### Testing Dashboard Metrics

After running this script, the **Supplier Dashboard** will show:

**For supplier1@contractors.jo:**
- **Total Orders:** 11
- **Today's Orders:** 3 (pending + 2 confirmed)
- **Pending Orders:** 3 (status = 'confirmed')
- **Today's Deliveries:** 2 (in_delivery + delivered)
- **Active Products:** ~12 (all products in stock)
- **Total Earnings:** 180.00 JOD (1 completed order)
- **Low Stock Products:** ~0-3 (random)

**Recent Orders Table:** Shows last 5 orders with:
- Mix of statuses
- Different amounts (< 120 and ≥ 120 JOD)
- Various delivery dates

### Testing Order Details

Each order includes:
- Order items (1-3 random products)
- Delivery record (for accepted/in_delivery/delivered/completed)
- Payment record with correct status
- Proper confirmation method (photo vs PIN based on amount)

### Cleanup

To remove all test data and start fresh:

```bash
# Reset the database (WARNING: This deletes ALL data!)
pnpm db:reset
```

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from your Supabase project dashboard:
1. Project Settings → API → Project URL
2. Project Settings → API → service_role key (keep this secret!)

### Troubleshooting

**Error: "Missing Supabase credentials"**
- Make sure environment variables are set
- Check `.env.local` file exists and has correct values

**Error: "User already exists"**
- Script will skip existing users and continue
- Safe to run multiple times (will create duplicate orders)

**Error: "Failed to create products"**
- Check supplier was created successfully
- Verify Supabase RLS policies allow service role access

### Script Architecture

```typescript
1. Create Suppliers
   ├── Create auth user (supplier_admin role)
   ├── Create profile record
   ├── Create supplier record
   └── Create 12 products (3 per category)

2. Create Contractors
   ├── Create auth user (contractor role)
   └── Create profile record

3. Create Orders (for each supplier)
   ├── Select random products (1-3 items)
   ├── Calculate totals (with delivery fee)
   ├── Create order record
   ├── Create order_items
   ├── Create delivery record (if applicable)
   └── Create payment record (if applicable)
```

### Contributing

To add new test scenarios:

1. **Add new order status:**
   - Update `ORDER_STATUSES` array
   - Add new order in `main()` function
   - Set appropriate payment/delivery states

2. **Add new supplier:**
   - Update `TEST_SUPPLIERS` array
   - Script will auto-create products

3. **Test edge cases:**
   - Modify `totalAmount` in `createOrder()` calls
   - Adjust `createdDaysAgo` and `deliveryDaysFromNow`

### Related Files

- `seed-test-orders.mjs` - Legacy seed script (simpler, fewer scenarios)
- `check-orders.mjs` - Order verification script
- Database migrations in `supabase/migrations/`
