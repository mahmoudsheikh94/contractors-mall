# 🧪 Real Authentication Simulation - Complete Step-by-Step Guide

## ⚠️ CRITICAL: Do This FIRST

### Step 0: Apply Database Fix

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy ENTIRE contents** of `supabase/migrations/20250129_complete_schema_fix.sql`
3. **Paste** into SQL Editor
4. **Click "Run"**
5. **Wait for success messages** - You should see:
   ```
   ✅ Phone column allows NULL
   ✅ Created 5 RLS policies for profiles table
   ✅ upsert_profile function created successfully
   ✅ COMPLETE SCHEMA FIX APPLIED SUCCESSFULLY
   ```

6. **Verify the fix worked**:
   ```sql
   -- Run this query to check
   SELECT column_name, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'profiles'
   AND column_name IN ('phone', 'email');
   ```

   Expected result:
   ```
   phone  | YES
   email  | YES
   ```

### Step 1: Restart Development Server

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart
pnpm dev
```

Wait for:
```
✓ Ready in 2s
- Local:        http://localhost:3000
```

---

## 🧪 SIMULATION 1: New User Registration (Email Auth)

### Pre-Test Checklist
- [ ] Database migration applied successfully
- [ ] Dev server running
- [ ] Browser DevTools open (F12)
- [ ] Console tab open (watch for errors)
- [ ] Network tab open (watch for failed requests)

### Step-by-Step Test

#### 1.1 Clear All Browser State

Open Console (F12) and run:
```javascript
// Clear everything
localStorage.clear()
sessionStorage.clear()

// Clear all cookies
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
})

console.log("✅ Browser state cleared")
```

Refresh the page (F5)

#### 1.2 Navigate to Registration

1. Go to: http://localhost:3000/auth/register
2. **Verify page loads** - Should see "إنشاء حساب جديد"

#### 1.3 Enter Email

1. Enter email: `sim-test-1@example.com`
2. **Note**: Use a unique email each time you test

#### 1.4 Submit Registration

1. Click "إنشاء حساب" button
2. **Watch Console** - Should NOT see any errors
3. **Watch Network tab** - Look for XHR requests
4. **Expected behavior**:
   - Success message appears: "تحقق من بريدك الإلكتروني"
   - No error messages
   - No red 500 errors in Network tab

#### 1.5 Check Email for Magic Link

1. Open your email inbox
2. Find email from Supabase
3. **Subject**: Usually "Confirm your signup" or "Magic Link"
4. **Copy the magic link URL**

#### 1.6 Click Magic Link

1. Click the magic link (or paste URL in browser)
2. **Watch what happens**:
   - URL should be: `http://localhost:3000/auth/callback?code=...`
   - **Watch Console** for logs
   - **Watch Network** tab

3. **Expected outcomes**:

   **Outcome A - Auto Profile Creation Success**:
   - Redirects to `/dashboard` directly
   - Console shows: "Profile created successfully"

   **Outcome B - Manual Profile Needed**:
   - Redirects to `/auth/complete-profile`
   - Form appears to fill profile data

#### 1.7A If Redirected to Dashboard

**✅ SUCCESS PATH**

1. **Verify** you're on `/dashboard`
2. **Check Console** - No errors
3. **Verify in Database**:
   ```sql
   SELECT id, email, phone, full_name, role
   FROM profiles
   WHERE email = 'sim-test-1@example.com';
   ```

   Expected:
   ```
   email: sim-test-1@example.com
   phone: NULL  ← This is CRITICAL
   full_name: (empty or from metadata)
   role: contractor
   ```

#### 1.7B If Redirected to Complete Profile

**Expected Path for First-Time Users**

1. **Verify** you're on `/auth/complete-profile`
2. **Fill the form**:
   - Full Name: `Test User 1`
   - Account Type: `مقاول` (Contractor)
   - Language: `العربية` (Arabic)

3. **Submit the form**
   - Click "حفظ البيانات"
   - **Watch Network tab** - Should see POST to `/api/auth/profile`

4. **Check Response**:
   - Status should be `200`
   - Response body:
     ```json
     {
       "success": true,
       "profile": {...},
       "redirectUrl": "/dashboard"
     }
     ```

5. **Should redirect** to `/dashboard`

#### 1.8 Verify Profile in Database

**CRITICAL CHECK**

```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  email,
  phone,
  full_name,
  role,
  preferred_language,
  is_active,
  created_at
FROM profiles
WHERE email = 'sim-test-1@example.com';
```

**Expected Results**:
```
id: [UUID]
email: sim-test-1@example.com
phone: NULL  ← MUST be NULL, not empty string!
full_name: Test User 1
role: contractor
preferred_language: ar
is_active: true
created_at: [timestamp]
```

**❌ FAILURE INDICATORS**:
- phone is '' (empty string) instead of NULL
- Any column is undefined
- Row doesn't exist

---

## 🧪 SIMULATION 2: Existing User Login

### Step-by-Step Test

#### 2.1 Sign Out

1. If still logged in, sign out
2. Verify redirect to homepage or login page

#### 2.2 Clear Auth Cookies Only

```javascript
// Clear just auth cookies
document.cookie = "sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
document.cookie = "sb-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
console.log("✅ Auth cookies cleared")
```

#### 2.3 Navigate to Login

1. Go to: http://localhost:3000/auth/login
2. **Verify page loads**

#### 2.4 Enter Same Email

1. Enter: `sim-test-1@example.com`
2. Click "إرسال رمز التحقق"

#### 2.5 Get New Magic Link

1. Check email inbox
2. Find new magic link
3. **Click it**

#### 2.6 Expected Behavior

**Should go DIRECTLY to `/dashboard`**
- **NO** complete-profile page
- **NO** errors
- Profile already exists, so skip setup

#### 2.7 Verify in Console

Look for log message like:
```
Profile exists, redirecting to dashboard
```

---

## 🧪 SIMULATION 3: Incomplete Registration Recovery

### Scenario
User starts registration but closes browser before completing profile.

### Step-by-Step Test

#### 3.1 Start Fresh

1. Clear browser state (see 1.1)
2. Use new email: `sim-test-2@example.com`

#### 3.2 Register and Get Magic Link

1. Go to `/auth/register`
2. Enter `sim-test-2@example.com`
3. Submit
4. Get magic link from email

#### 3.3 Close Browser WITHOUT Clicking Link

1. **CLOSE** the entire browser
2. Wait 1 minute

#### 3.4 Later - Click the Magic Link

1. Open browser again
2. Click the magic link from email

#### 3.5 Expected Behavior

**Should redirect to `/auth/complete-profile`**
- Form appears
- Can complete profile
- After submit → Dashboard

---

## 🧪 SIMULATION 4: Test NULL Phone Handling

### Direct Database Test

```sql
-- Try to insert profile with NULL phone directly
INSERT INTO profiles (
  id,
  email,
  phone,
  full_name,
  role,
  preferred_language,
  is_active
) VALUES (
  gen_random_uuid(),
  'direct-test@example.com',
  NULL,  -- This MUST work
  'Direct Test User',
  'contractor',
  'ar',
  true
);

-- Verify
SELECT * FROM profiles WHERE email = 'direct-test@example.com';

-- Clean up
DELETE FROM profiles WHERE email = 'direct-test@example.com';
```

**If this fails** with "violates not-null constraint":
- ❌ Migration wasn't applied correctly
- ❌ You need to run the migration again

---

## ❌ Common Errors & Solutions

### Error: "phone violates not-null constraint"

**Cause**: Migration not applied

**Solution**:
```sql
-- Run this
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
```

### Error: "infinite recursion detected"

**Cause**: Old RLS policies still exist

**Solution**:
```sql
-- Drop ALL policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Then create simple ones (see migration file)
```

### Error: "row-level security policy violated"

**Cause**: Policies too restrictive

**Solution**:
1. Check if simple policies exist:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
   ```
2. Should see: `simple_insert`, `simple_select`, etc.
3. If not, run the migration

### Error: "Cannot read property 'role' of null"

**Cause**: Profile not created

**Solution**:
1. Check database:
   ```sql
   SELECT * FROM profiles WHERE email = '[your-email]';
   ```
2. If no row, profile creation failed
3. Check Console and Network tab for the real error

---

## ✅ Success Checklist

After ALL simulations, verify:

- [ ] New user can register with email
- [ ] Phone field is NULL in database (not empty string)
- [ ] Email field is populated
- [ ] Magic link works and redirects correctly
- [ ] Existing user can login and skip profile setup
- [ ] Incomplete registration can be recovered
- [ ] No "infinite recursion" errors in logs
- [ ] No "NOT NULL constraint" errors
- [ ] All Network requests return 200 or 307 (redirect)
- [ ] Console has no red errors

---

## 📊 Database Validation

Run these queries after ALL tests:

```sql
-- Check all test profiles
SELECT
  email,
  phone,
  full_name,
  role,
  preferred_language,
  created_at
FROM profiles
WHERE email LIKE 'sim-test%' OR email LIKE '%test%'
ORDER BY created_at DESC;

-- Verify phone is NULL for email auth
SELECT
  COUNT(*) as total,
  COUNT(phone) as with_phone,
  COUNT(email) as with_email
FROM profiles;

-- Check RLS policies
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'profiles';
```

---

## 🎯 Final Validation

If ALL simulations pass:

✅ **Phase 1 (Authentication) is COMPLETE!**

You can now confidently:
- Register users with email (dev mode)
- Support phone-based auth (production mode)
- Handle profile creation seamlessly
- Manage user sessions correctly

**Next phase**: Supplier onboarding or Product catalog (Phase 2)