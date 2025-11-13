# Jordan E-Invoicing System Setup

## Overview

This document provides instructions for the Jordan E-Invoicing System compliance feature for Contractors Mall.

**Status**: ✅ **FULLY OPERATIONAL** (as of January 13, 2025)

All migrations have been applied and invoice generation is working in production.

## Migration Application

✅ **COMPLETE** - All migrations applied to production database:

1. `supabase/migrations/20250113000000_create_invoicing_system.sql` - Core schema
2. `supabase/migrations/20250113150000_fix_invoice_rls_policies.sql` - RLS fixes
3. `supabase/migrations/20250113160000_fix_invoice_line_items_rls.sql` - Line items RLS

### Method 1: Supabase Dashboard (Recommended)

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/sql)
2. Create a new query
3. Copy the entire contents of `supabase/migrations/20250113000000_create_invoicing_system.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration
6. Verify success by checking for the `invoices` and `invoice_line_items` tables

### Method 2: psql Command Line

If you have PostgreSQL client tools installed:

```bash
PGPASSWORD="5822075Mahmoud94$" psql \
  "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20250113000000_create_invoicing_system.sql
```

### Method 3: Supabase CLI (After Migration Sync)

```bash
# First, sync migration history
pnpm supabase migration repair --status reverted 20250126
pnpm supabase db pull

# Then push the new migration
pnpm supabase db push
```

## Features Created

### Database Tables

1. **invoices**
   - Sequential invoice numbering per supplier
   - 3 invoice types: income, sales_tax, special_tax
   - 3 categories: local, export, development_zone
   - Denormalized seller/buyer details for compliance
   - Full audit trail

2. **invoice_line_items**
   - Product/service line items
   - Automatic tax calculations
   - Support for discounts and special taxes

### Enums Created

- `invoice_type`: income, sales_tax, special_tax
- `invoice_category`: local, export, development_zone
- `invoice_status`: draft, issued, submitted_to_portal, cancelled
- `submission_status`: pending, success, failed
- `buyer_id_type`: national_id, tax_number, personal_number
- `invoice_item_type`: product, service, service_allowance

### Functions

- `generate_invoice_number(p_supplier_id UUID)`: Generates sequential invoice numbers per supplier
  - Format: `SUP{6chars}-{year}-{0001}`
  - Example: `SUP3d4f2a-2025-0001`

### RLS Policies

- Suppliers can view/create/update their own invoices
- Contractors can view invoices for their orders
- Admins have full access
- Draft invoices can be updated; issued invoices are read-only

## Backend API

### Endpoint: POST /api/invoices/generate

Generates Jordan-compliant invoices from delivered orders.

**Request Body:**
```typescript
{
  orderId: string                    // Required
  invoiceType: 'income' | 'sales_tax' | 'special_tax'  // Required
  invoiceCategory?: 'local' | 'export' | 'development_zone'
  notes?: string
  // Optional buyer details
  buyerName?: string
  buyerIdType?: 'national_id' | 'tax_number' | 'personal_number'
  buyerIdNumber?: string
  buyerPhone?: string
  buyerCity?: string
  buyerPostalCode?: string
}
```

**Business Rules:**
- Only delivered/completed orders can be invoiced
- Buyer name required for orders ≥10,000 JOD
- Development zone invoices require buyer tax number
- Supplier must have tax registration configured
- One invoice per order (no duplicates)

**Tax Calculations:**
- Income invoices: No tax calculations
- Sales tax invoices: 16% general sales tax (configurable)
- Special tax invoices: Manual special tax + 16% general tax
- Export/Development zone: 0% tax rate

## Jordan Compliance

### Standards Followed

- **Compliance**: Jordan Income and Sales Tax Department
- **Standard**: National Invoicing System User Manual (2024)
- **Portal**: portal.jofotara.gov.jo

### Required Fields

Per Jordan regulations, invoices must include:

**Seller (البائع):**
- Tax number (required)
- Business name (Arabic)
- Business name (English, optional)
- Phone, address, city

**Buyer (المشتري):**
- Name (required for receivables and orders ≥10,000 JOD)
- ID type and number (optional, except development zones)
- Phone, city, postal code

**Line Items:**
- National activity classification (optional)
- Item type: product/service/service allowance
- Description (required in Arabic)
- Quantity, unit price, discount
- Tax calculations

### Invoice Numbering

Sequential, gapless numbering per supplier:
- Format: `SUP{supplier_id_short}-{year}-{sequence}`
- Example: `SUP3d4f2a-2025-0001`, `SUP3d4f2a-2025-0002`
- Resets annually

## Next Steps

1. **Apply Migration** (choose one method above)
2. **Configure Supplier Tax Registration**
   - Add UI for suppliers to enter tax_number
   - Add fields: tax_registration_name, tax_registration_name_en
3. **Build Invoice UI**
   - Invoice generation form for suppliers
   - Invoice list/history page
   - PDF generation and download
4. **Phase 2: Portal Integration** (Future)
   - API integration with portal.jofotara.gov.jo
   - Automated submission
   - Electronic invoice number retrieval

## Verification

After applying the migration, verify with:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('invoices', 'invoice_line_items');

-- Check enums exist
SELECT typname
FROM pg_type
WHERE typname IN ('invoice_type', 'invoice_category', 'invoice_status');

-- Test invoice number generation
SELECT generate_invoice_number(auth.uid()::uuid);
```

## Troubleshooting

### Common Issues (RESOLVED)

All critical bugs have been fixed as of January 13, 2025. Documented here for reference:

#### 1. Foreign Key Violation (created_by)
**Error**: `violates foreign key constraint "invoices_created_by_fkey"`
**Cause**: Passing wrong ID type (supplier.id instead of user.id)
**Fixed**: ✅ In generator.ts and route.ts

#### 2. RLS Policy Failures
**Error**: `new row violates row-level security policy`
**Cause**: Policies checked `supplier_id = auth.uid()` (wrong ID types)
**Fixed**: ✅ Migrations 20250113150000 and 20250113160000

#### 3. Missing Column Error
**Error**: `column profiles_1.city does not exist`
**Cause**: Referenced non-existent contractor.city column
**Fixed**: ✅ Removed from generator.ts

#### 4. Null Value Errors
**Error**: `Cannot read properties of null (reading 'toString')`
**Cause**: Order items with null unit_price_jod
**Solution**: Added validation to detect and report missing data

### Current Limitations

1. **No PDF Generation**: Invoices created but PDFs not auto-generated (Phase 2)
2. **No Portal Submission**: Manual submission only (Phase 2 API integration)
3. **No Return Invoices**: UI not implemented (database supports it)
4. **No Bulk Operations**: Generate one invoice at a time

## Support

For Jordan e-invoicing system questions:
- Official Portal: portal.jofotara.gov.jo
- User Manual: See `docs/jordan invoicing system.pdf`
- Tax Department: Jordan Income and Sales Tax Department
