# Registration Fix Guide

## Problem
Registration fails with error:
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"profiles\""
}
```

## Root Cause
The `profiles` and `suppliers` tables are missing INSERT policies, which prevents new users from creating their profile and supplier records during registration.

## Step-by-Step Fix

### Step 1: Diagnose the Current State

Run the diagnostic script to confirm the problem:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of: `supabase/scripts/diagnose_and_fix_registration.sql`
3. Click **Run**

**Expected Output:**
```
❌ PROBLEM: profiles table has NO INSERT policy!
❌ PROBLEM: suppliers table has NO INSERT policy!
```

### Step 2: Apply the Fix Migration

You have **two options** to apply the fix:

#### Option A: Via Supabase Dashboard (Recommended)

1. Open the migration file: `supabase/migrations/20251031_fix_registration_rls_policies.sql`
2. Copy the entire contents
3. Go to **Supabase Dashboard** → **SQL Editor**
4. Paste the contents
5. Click **Run**

You should see success messages indicating the policies were created.

#### Option B: Via Command Line

```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
pnpm supabase db push
```

This will apply all pending migrations, including the registration fix.

### Step 3: Verify the Fix

Run the verification script to confirm the fix worked:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of: `supabase/scripts/verify_registration_fix.sql`
3. Click **Run**

**Expected Output:**
```
✅ profiles: INSERT policy exists
✅ profiles: UPDATE policy exists
✅ suppliers: INSERT policy exists
✅ suppliers: UPDATE policy exists

✅ SUCCESS! All required policies exist!
```

### Step 4: Test Registration

1. Open your admin portal: http://localhost:3001/auth/register
2. Fill out the registration form with a **new email** (not previously used)
3. Submit the form
4. **Expected Result:** You should be redirected to the login page with a success message
5. **NOT Expected:** No "42501" error should appear

### Step 5: Login and Verify

1. Go to: http://localhost:3001/auth/login
2. Login with the email you just registered
3. You should see the supplier dashboard

## What the Fix Does

The migration adds 4 critical RLS policies:

1. **"Users can create their own profile"** (INSERT on profiles)
   - Allows authenticated users to insert a profile row where `auth.uid() = id`
   - This runs during registration after `auth.signUp()` succeeds

2. **"Users can update own profile"** (UPDATE on profiles)
   - Allows users to update their own profile data

3. **"Users can create supplier for themselves"** (INSERT on suppliers)
   - Allows authenticated users to insert a supplier row where `auth.uid() = owner_id`
   - This runs during supplier registration

4. **"Supplier admins can update their supplier"** (UPDATE on suppliers)
   - Allows supplier admins to update their business information

## Registration Flow (After Fix)

1. User fills registration form
2. Frontend calls `supabase.auth.signUp({ email, password })`
   - ✅ Creates record in `auth.users` table
   - ✅ User is immediately authenticated (session created)
3. Frontend calls INSERT into `profiles` table
   - ✅ Now **succeeds** because INSERT policy exists
4. Frontend calls INSERT into `suppliers` table
   - ✅ Now **succeeds** because INSERT policy exists
5. User is redirected to login page
6. User can login and access supplier dashboard

## Troubleshooting

### If diagnostic shows policies already exist:

The issue may be different. Check:
1. Is the user actually authenticated after `signUp()`?
2. Are there any other RLS policies interfering?
3. Check browser console for the exact error

### If migration fails to apply:

1. Check for syntax errors in the SQL output
2. Try running each policy creation separately
3. Check if there are conflicting policy names

### If registration still fails after fix:

1. Check browser console for the exact error
2. Run the diagnostic script again to verify policies exist
3. Try with a completely new email (not previously attempted)
4. Check if there are any database triggers interfering

## Files Reference

- **Migration:** `supabase/migrations/20251031_fix_registration_rls_policies.sql`
- **Diagnostic:** `supabase/scripts/diagnose_and_fix_registration.sql`
- **Verification:** `supabase/scripts/verify_registration_fix.sql`
- **Registration Page:** `apps/admin/src/app/auth/register/page.tsx`
