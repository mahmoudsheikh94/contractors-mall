# Fix Stuck Delivered Orders Script

## Purpose

This script fixes orders that are stuck in 'delivered' status when they should be 'completed'. This happens when:
- Contractor has confirmed delivery
- Payment has been released to supplier
- Order status was not automatically updated to 'completed'

## Problem Background

In the delivery confirmation flow, some orders fail to transition from 'delivered' to 'completed' status even after payment is released. This prevents suppliers from:
- Seeing the correct order status
- Generating invoices (which require 'completed' status)

## What This Script Does

1. **Identifies stuck orders**: Finds all orders with status='delivered' and payment status='released'
2. **Updates order status**: Changes status from 'delivered' to 'completed'
3. **Creates audit trail**: Logs the fix in order_activities table
4. **Verifies results**: Shows updated orders and checks for remaining issues

## How to Run

### Prerequisites

- PostgreSQL client (psql) installed
- Production database credentials
- Backup recommended before running

### Execution

```bash
# Using local PostgreSQL client
PGPASSWORD="5822075Mahmoud94$" /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f scripts/fix-stuck-delivered-orders.sql
```

Or using the environment variable:

```bash
# Set password
export PGPASSWORD="5822075Mahmoud94$"

# Run script
psql "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f scripts/fix-stuck-delivered-orders.sql
```

## Safety

- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Non-destructive**: Only updates orders that meet specific criteria
- ✅ **Audit trail**: Creates activity logs for all changes
- ✅ **Verification**: Shows results and checks for remaining issues

## Expected Output

The script will show:
1. Current state of stuck orders
2. Count of affected orders
3. Number of orders updated
4. List of updated order numbers
5. Verification of successful updates
6. Count of any remaining stuck orders (should be 0)

## Example Output

```
============================================
    FIX STUCK DELIVERED ORDERS
============================================

1. Current state of stuck orders:
   Orders in "delivered" status with "released" payments:

                  id                  | order_number | order_status | payment_status |         created_at
--------------------------------------+--------------+--------------+----------------+----------------------------
 c01618c4-5394-4cde-b5f5-52ca2f8d403a | ORD-20250113-001 | delivered    | released       | 2025-01-13 10:30:00

2. Count of affected orders:
 stuck_orders_count
--------------------
                  1

============================================
   APPLYING FIX
============================================

3. Updating orders to completed status...

 updated_count |  updated_orders
---------------+------------------
             1 | ORD-20250113-001

4. Creating activity logs for updated orders...

INSERT 0 1

============================================
   VERIFICATION
============================================

5. Verification - Orders that should now be completed:

                  id                  | order_number | order_status | payment_status |        updated_at
--------------------------------------+--------------+--------------+----------------+----------------------------
 c01618c4-5394-4cde-b5f5-52ca2f8d403a | ORD-20250113-001 | completed    | released       | 2025-01-13 11:00:00

6. Check for remaining stuck orders:

 remaining_stuck_orders
------------------------
                      0

============================================
   ✅ FIX COMPLETE
============================================
```

## After Running

Once the script completes:
1. Orders will show 'completed' status in the supplier portal
2. Suppliers can now generate invoices for these orders
3. The Complete Order button will no longer appear (order already completed)
4. Order activities will show the data fix in the timeline

## Related Files

- **API Fix**: `/apps/web/src/app/api/orders/[orderId]/confirm-delivery/route.ts` - Added error logging
- **Manual Complete Button**: `/apps/admin/src/components/supplier/orders/CompleteOrderButton.tsx` - Allows manual completion
- **Complete Order API**: `/apps/admin/src/app/api/supplier/orders/[id]/complete/route.ts` - Manual completion endpoint

## Prevention

The root cause has been addressed by:
1. Adding comprehensive error logging to delivery confirmation API
2. Creating a manual "Complete Order" button for suppliers
3. Improving error handling in the automatic completion flow

## Support

If you encounter issues:
1. Check the order_activities table for audit trail
2. Verify payment status is 'released'
3. Check application logs for delivery confirmation errors
4. Contact support with order ID

---

**Created**: January 13, 2025
**Last Updated**: January 13, 2025
**Maintainer**: Mahmoud Sheikh Alard
