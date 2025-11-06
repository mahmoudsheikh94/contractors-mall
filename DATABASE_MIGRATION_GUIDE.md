# Database Migration Guide

## Current Status

**Date:** November 6, 2025

### Remote Database State

The remote Supabase database (zbscashhrdeofvgjnbsb) is currently missing several migrations:
- Only 5 migrations have been applied (through 20250126)
- Email verification columns (`email_verified`, `email_verified_at`) are **NOT** present
- Phone verification was never added (good - we don't want it)

### Local Migration State

Local migrations include:
- `20251031_add_email_verification.sql` - Adds email verification columns (✅ Safe to apply)
- `20251106_cleanup_phone_verification.sql` - Removes phone verification (⚠️ NOT NEEDED - columns don't exist)

### Required Actions

#### 1. Apply Email Verification Migration

The database needs the email verification columns. Run this SQL directly in the Supabase SQL Editor:

```sql
-- Add email verification columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified
ON profiles(email_verified);

-- Mark existing users as verified (they registered successfully before this feature)
UPDATE profiles
SET email_verified = true,
    email_verified_at = created_at
WHERE email_verified IS NULL OR email_verified = false;

-- Add comments
COMMENT ON COLUMN profiles.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN profiles.email_verified_at IS 'Timestamp when email was verified';
```

#### 2. Verify the Changes

After applying, verify:

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('email_verified', 'email_verified_at');

-- Check existing users are verified
SELECT COUNT(*) as total_users,
       COUNT(*) FILTER (WHERE email_verified = true) as verified_users
FROM profiles;
```

#### 3. Regenerate Types

After the database is updated, regenerate TypeScript types:

```bash
export SUPABASE_PROJECT_ID=zbscashhrdeofvgjnbsb
./scripts/generate-types.sh
```

## Migration Issues Encountered

### Issue: Duplicate RLS Policies

**Problem:** Migration `20250126_add_missing_rls_policies.sql` failed because policies already existed.

**Fix Applied:** Added `DROP POLICY IF EXISTS` statements before each `CREATE POLICY`.

**File Modified:** `supabase/migrations/20250126_add_missing_rls_policies.sql`

### Issue: Phone Verification Cleanup Not Needed

**Problem:** Created migration to remove phone verification columns, but they never existed in production.

**Resolution:**
- Archived the dual verification migration: `migrations_archive/20251105_add_dual_verification.sql`
- The cleanup migration `20251106_cleanup_phone_verification.sql` is not needed and can be deleted
- Database already has email-only verification structure

### Issue: Connection Timeouts

**Problem:** `npx supabase db push` hangs at "Initialising login role..."

**Workarounds:**
1. Use Supabase SQL Editor to run migrations manually
2. Or retry `db push` with increased timeout
3. Or check network/firewall settings

## Verification Requirements

### Current Implementation

#### Suppliers
- ✅ Cannot accept orders without `email_verified = true`
- ✅ See warning banner if email not verified
- ✅ Enforcement in: `apps/admin/src/app/supplier/orders/[order_id]/OrderActions.tsx`

#### Contractors
- ❌ **TODO:** Must verify email before submitting orders
- ❌ **TODO:** Need warning banner on cart/checkout pages
- ❌ **TODO:** Need enforcement in order submission flow

### New Requirement (User Request)

> "I want contractors to be unable to submit the order unless their email is verified"

This requires:
1. Database: email verification columns (see Step 1 above)
2. Frontend: Warning banner on contractor checkout page
3. Backend: Validation in order submission API/RPC
4. UI: Clear error message if unverified user tries to checkout

## Next Steps

1. ✅ Fixed RLS policy migration
2. ✅ Archived unused phone verification migration
3. ✅ Created cleanup migration (not needed but safe)
4. ⏳ Apply email verification migration manually (SQL above)
5. ⏳ Regenerate types after database update
6. ⏳ Add contractor email verification enforcement
7. ⏳ Test both flows (supplier + contractor)

## Files Modified

- `supabase/migrations/20250126_add_missing_rls_policies.sql` - Added DROP IF EXISTS
- `supabase/migrations_archive/20251105_add_dual_verification.sql` - Archived (never applied)
- `supabase/CURRENT_SCHEMA_BACKUP_20251106.sql` - Backup of current state
- `scripts/fix-migrations.sh` - Attempted fix script (command syntax issue)

## Related Documentation

- [AUTOMATION_SETUP.md](./AUTOMATION_SETUP.md) - CI/CD and type generation
- [DUAL_AUTH_IMPLEMENTATION_SUMMARY.md](./DUAL_AUTH_IMPLEMENTATION_SUMMARY.md) - Auth implementation details
- [MANUAL_TESTING_INSTRUCTIONS.md](./MANUAL_TESTING_INSTRUCTIONS.md) - Testing procedures
