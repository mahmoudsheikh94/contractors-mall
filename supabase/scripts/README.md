# Supabase SQL Scripts

Helper SQL scripts for database setup, verification, and troubleshooting.

## 📁 Files

### `verify_schema.sql`
**Purpose**: Comprehensive schema verification
**When to use**: After running migrations to confirm everything is set up correctly

**What it checks:**
- ✅ All required tables exist
- ✅ Critical columns are present
- ✅ Enums are defined with correct values
- ✅ Row Level Security is enabled
- ✅ Record counts in each table

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `verify_schema.sql`
3. Click "Run"
4. Check results - all items should show ✅

---

### `create_test_supplier.sql`
**Purpose**: Create and verify test supplier accounts
**When to use**: After registration or to set up test accounts

**Contains:**
- **Option 1**: Verify existing supplier from registration (RECOMMENDED)
- **Option 2**: Manually create supplier (for testing only)
- **Option 3**: Batch verify all unverified suppliers

**Usage:**
1. Register via http://localhost:3001/auth/register
2. Open this script
3. Replace `test@supplier.com` with your email
4. Run the verification UPDATE query
5. Test login at http://localhost:3001/auth/login

---

### `troubleshooting_queries.sql`
**Purpose**: Fix common database issues
**When to use**: When you encounter errors or missing data

**Fixes included:**
1. Missing `scheduled_date` column
2. Missing `deliveries` table
3. Dashboard query failures
4. Verification status issues
5. Role assignment problems
6. Missing enum values
7. Missing Phase 4 columns
8. Wrong table structure
9. RLS policy blocking
10. And more...

**Usage:**
1. Identify your error message
2. Find corresponding section in script
3. Run the diagnostic query
4. Run the fix query if needed

---

## 🚀 Quick Start

### First Time Setup

1. **Run migrations in order:**
   - `supabase/migrations/20241023000001_initial_schema.sql`
   - `supabase/migrations/20251030_create_core_tables.sql`
   - `supabase/migrations/20251030_phase4_delivery_confirmation.sql`

2. **Verify schema:**
   ```bash
   # Copy contents of verify_schema.sql
   # Paste into Supabase SQL Editor
   # Click Run
   ```

3. **Create test supplier:**
   - Go to http://localhost:3001/auth/register
   - Fill in registration form
   - Run verification query from `create_test_supplier.sql`

4. **Test login:**
   - Go to http://localhost:3001/auth/login
   - Use registration credentials
   - Should redirect to dashboard

---

## 🐛 Common Issues

### Error: "column 'scheduled_date' does not exist"
→ Use: `troubleshooting_queries.sql` Section 1

### Error: "relation 'deliveries' does not exist"
→ Run: `20251030_create_core_tables.sql` migration

### Login shows "Account Under Review"
→ Use: `create_test_supplier.sql` Option 1 (verification UPDATE)

### Dashboard queries failing
→ Use: `troubleshooting_queries.sql` Section 3

### Need to see what's in database
→ Use: `verify_schema.sql` (shows everything)

---

## 📝 Best Practices

1. **Always verify after migrations**: Run `verify_schema.sql` after applying migrations
2. **Use registration page**: Don't manually create users if possible
3. **Keep scripts updated**: If you modify schema, update these scripts
4. **Test in dev first**: Never run DROP commands on production
5. **Read comments**: Each script has detailed inline documentation

---

## 🔗 Related Documentation

- **Main Guide**: `DATABASE_SETUP_GUIDE.md` (comprehensive walkthrough)
- **Migration Files**: `supabase/migrations/` (actual schema changes)
- **Phase 5 Progress**: `PHASE5_SUPPLIER_PORTAL_PROGRESS.md` (feature status)

---

## 💡 Tips

- **Copy-paste friendly**: All scripts are designed to be copied into Supabase SQL Editor
- **Commented sections**: Uncomment only what you need
- **Replace placeholders**: Look for `YOUR-EMAIL-HERE` or `YOUR-SUPPLIER-ID` and replace with actual values
- **Run diagnostics first**: Always run SELECT queries before UPDATE/ALTER queries

---

**Last Updated**: October 30, 2025
**Compatible with**: Phase 5A Supplier Portal
