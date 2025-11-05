# 🧪 Complete Profile Creation Test & Simulation Guide

## Prerequisites

### 1. Apply the Database Fix FIRST

**Option A: Emergency Fix (Quick)**
```sql
-- Copy from: supabase/migrations/20250128_emergency_fix_recursion.sql
-- This immediately fixes the infinite recursion
```

**Option B: Complete Fix (Recommended)**
```sql
-- Copy from: supabase/migrations/20250128_complete_auth_fix.sql
-- This fixes recursion + language type + functions
```

Run in Supabase Dashboard → SQL Editor → Click "Run"

### 2. Verify the Fix

Run this query to check policies:
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

Expected output:
- `Allow insert own profile` (INSERT)
- `Allow select own profile` (SELECT)
- `Allow update own profile` (UPDATE)
- `Allow delete own profile` (DELETE)
- `Service role full access` (ALL)

## Full Profile Creation Simulation

### Step 1: Clean Browser State

```javascript
// Run in browser console (F12)
localStorage.clear()
sessionStorage.clear()
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
})
console.log("✅ Browser state cleared")
```

### Step 2: Test New User Registration

1. **Navigate to Registration**
   ```
   http://localhost:3000/auth/register
   ```

2. **Enter Test Email**
   ```
   test-recursion-fix@example.com
   ```

3. **Submit Form**
   - Click "إنشاء حساب"
   - Check console for errors (F12)
   - Should see: "Magic link sent" message

4. **Check Email**
   - Open email inbox
   - Find Supabase magic link
   - Copy the link

### Step 3: Test Magic Link Callback

1. **Click Magic Link**
   - Opens: `http://localhost:3000/auth/callback?token=...&type=magiclink`
   - Watch console for logs

2. **Expected Flow**
   ```
   Callback → Check Profile → Not Found → Auto-Create Attempt → Redirect
   ```

3. **If Auto-Create Succeeds**
   - Redirected to `/dashboard`
   - Profile created automatically

4. **If Auto-Create Fails**
   - Redirected to `/auth/complete-profile`
   - Manual profile creation needed

### Step 4: Complete Profile (If Needed)

1. **On Complete Profile Page**
   ```
   http://localhost:3000/auth/complete-profile
   ```

2. **Fill Form**
   - Full Name: `Test User`
   - Account Type: `مقاول` (Contractor)
   - Language: `العربية` (Arabic)

3. **Submit**
   - Click "حفظ البيانات"
   - Watch Network tab for `/api/auth/profile` POST

4. **Expected Response**
   ```json
   {
     "success": true,
     "profile": {...},
     "redirectUrl": "/dashboard"
   }
   ```

### Step 5: Verify Profile Creation

Run in Supabase SQL Editor:
```sql
SELECT
  id,
  email,
  phone,
  full_name,
  role,
  preferred_language,
  created_at
FROM profiles
WHERE email = 'test-recursion-fix@example.com';
```

## Testing All Scenarios

### Scenario 1: Fresh Registration ✅
```bash
# Clear state → Register → Magic link → Auto-profile → Dashboard
```

### Scenario 2: Incomplete Registration Recovery ✅
```bash
# Register → Close before profile → Login again → Complete profile → Dashboard
```

### Scenario 3: Existing User Login ✅
```bash
# Login with existing email → Magic link → Direct to dashboard
```

### Scenario 4: Duplicate Profile Prevention ✅
```bash
# Try to create profile twice → Second attempt updates, doesn't error
```

### Scenario 5: RLS Policy Test ✅
```bash
# Profile creation uses server API → No RLS recursion → Success
```

## API Testing with cURL

### Test Profile Creation API
```bash
# First, get a session token from browser
# F12 → Application → Cookies → sb-access-token

TOKEN="your-token-here"

curl -X POST http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=$TOKEN" \
  -d '{
    "full_name": "API Test User",
    "role": "contractor",
    "preferred_language": "ar"
  }'
```

### Test Profile Check API
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Cookie: sb-access-token=$TOKEN"
```

## Debugging Checklist

### If You See "Infinite Recursion" Error

1. **Check Applied Migration**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
   ```
   - Should NOT have any policy with `NOT EXISTS` checks

2. **Apply Emergency Fix**
   ```sql
   -- Run: 20250128_emergency_fix_recursion.sql
   ```

3. **Clear and Retry**
   - Clear browser state
   - Try registration again

### If You See "row-level security policy" Error

1. **Check RPC Function Exists**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'upsert_profile';
   ```

2. **Test RPC Directly**
   ```sql
   SELECT * FROM upsert_profile(
     gen_random_uuid(),
     'rpc-test@example.com',
     null,
     'RPC Test',
     'contractor',
     'ar'
   );
   ```

### If Language Field Errors

1. **Check Column Type**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'profiles'
   AND column_name = 'preferred_language';
   ```
   - Should be: `text` not enum

2. **Check Constraint**
   ```sql
   SELECT constraint_name
   FROM information_schema.table_constraints
   WHERE table_name = 'profiles'
   AND constraint_type = 'CHECK';
   ```

## Success Indicators

✅ **No recursion errors in Supabase logs**
✅ **Profile creation succeeds on first attempt**
✅ **Can login and logout multiple times**
✅ **Language field accepts 'ar' or 'en'**
✅ **Role-based redirects work correctly**

## Complete Test Sequence

```bash
# 1. Clear everything
Clear browser state

# 2. Register new user
Email: test1@example.com → Get magic link

# 3. Click magic link
Should create profile automatically or redirect to complete-profile

# 4. Complete profile if needed
Fill form → Submit → Dashboard

# 5. Logout
Sign out → Back to homepage

# 6. Login again
Same email → Magic link → Direct to dashboard

# 7. Check database
SELECT * FROM profiles WHERE email = 'test1@example.com';
```

## Expected Database State

After successful registration and profile creation:

```sql
SELECT
  id,                     -- UUID from auth.users
  email,                  -- 'test1@example.com'
  phone,                  -- NULL (for email auth)
  full_name,              -- 'Test User'
  role,                   -- 'contractor'
  preferred_language,     -- 'ar' (as TEXT)
  is_active,              -- true
  created_at,             -- timestamp
  updated_at              -- timestamp
FROM profiles
WHERE email = 'test1@example.com';
```

## Ready to Test! 🚀

1. ✅ Database migration applied
2. ✅ Dev server running (`pnpm dev`)
3. ✅ Browser state cleared
4. ✅ Supabase Dashboard open for monitoring

Start with Step 2: Test New User Registration

Good luck! The infinite recursion should be completely fixed now.