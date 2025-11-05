# 🔍 Authentication Debug Checklist & Validation Queries

## Quick Diagnosis Commands

### 1. Check Migration Status

```sql
-- Check if phone allows NULL
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('phone', 'email', 'preferred_language')
ORDER BY column_name;
```

**Expected Output**:
```
email              | text | YES | NULL
phone              | text | YES | NULL
preferred_language | text | YES | 'ar'::text
```

**❌ If phone is_nullable = NO**: Migration not applied!

### 2. Check RLS Policies

```sql
-- List all policies
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**Expected Output** (5 policies):
```
simple_insert  | INSERT | PERMISSIVE | {authenticated} | NULL | (auth.uid() = id)
simple_select  | SELECT | PERMISSIVE | {authenticated} | (auth.uid() = id) | NULL
simple_update  | UPDATE | PERMISSIVE | {authenticated} | (auth.uid() = id) | (auth.uid() = id)
simple_delete  | DELETE | PERMISSIVE | {authenticated} | (auth.uid() = id) | NULL
service_all    | ALL    | PERMISSIVE | {service_role}  | true | true
```

**❌ If you see policies with `NOT EXISTS` in qual/with_check**: Infinite recursion will occur!

### 3. Check Functions

```sql
-- Check if upsert function exists
SELECT
  proname,
  pronargs,
  proargnames,
  prosecdef
FROM pg_proc
WHERE proname = 'upsert_profile';
```

**Expected**: 1 row with `proname = upsert_profile` and `prosecdef = t` (security definer)

### 4. Test Direct Insert

```sql
-- Try inserting with NULL phone
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO profiles (id, email, phone, full_name, role, preferred_language)
  VALUES (test_id, 'test@example.com', NULL, 'Test', 'contractor', 'ar');

  RAISE NOTICE '✅ INSERT with NULL phone succeeded';

  DELETE FROM profiles WHERE id = test_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ INSERT failed: %', SQLERRM;
END $$;
```

**Success**: Shows "✅ INSERT with NULL phone succeeded"
**Failure**: Shows exact error message

---

## Error Diagnosis Matrix

| Error Message | Likely Cause | Solution Query |
|---------------|--------------|----------------|
| "phone violates not-null constraint" | Phone column requires NOT NULL | `ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;` |
| "infinite recursion detected" | RLS policies check profiles table | Drop all policies, recreate simple ones |
| "row-level security policy violated" | Policies too restrictive | Check policies with query #2 above |
| "function upsert_profile does not exist" | Function not created | Run migration Part 5 |
| "language enum invalid" | preferred_language is still enum | `ALTER TABLE profiles ALTER COLUMN preferred_language TYPE TEXT;` |
| "duplicate key value violates unique constraint" | Trying to insert existing profile | Use UPSERT or ON CONFLICT |

---

## Browser Console Debugging

### Check Current User

```javascript
// In browser console
const { createClient } = await import('/src/lib/supabase/client')
const supabase = createClient()

const { data: { user }, error } = await supabase.auth.getUser()
console.log('Current user:', user)
console.log('Email:', user?.email)
console.log('Phone:', user?.phone)
console.log('User ID:', user?.id)
```

### Check Current Profile

```javascript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

console.log('Profile:', profile)
console.log('Phone field:', profile?.phone)
console.log('Email field:', profile?.email)
```

### Test Profile Creation Manually

```javascript
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: user.id,
    email: user.email,
    phone: null,  // Explicitly NULL
    full_name: 'Test User',
    role: 'contractor',
    preferred_language: 'ar'
  })
  .select()

console.log('Insert result:', data)
console.log('Insert error:', error)
```

---

## Network Tab Debugging

### What to Look For

1. **Auth Callback Request**
   - URL: `/auth/callback?code=...`
   - Status: Should be `307` (redirect)
   - Check Response Headers → Location header

2. **Profile API Request**
   - URL: `/api/auth/profile`
   - Method: `POST`
   - Status: Should be `200`
   - Response Body: Should have `success: true`

3. **Profile Check Request**
   - URL: `/api/auth/profile`
   - Method: `GET`
   - Status: `200` (exists) or `401` (not authenticated)

### Common Network Errors

| Status | URL | Meaning | Fix |
|--------|-----|---------|-----|
| 500 | /api/auth/profile | Server error during profile creation | Check Console logs, verify migration |
| 401 | /api/auth/profile | Not authenticated | User session expired, login again |
| 404 | /auth/callback | Callback route not found | Check routing, restart dev server |
| 307 | /auth/callback | Redirect (normal) | Follow redirect, check destination |

---

## Supabase Dashboard Checks

### 1. Auth Logs

1. Go to **Dashboard → Logs → Auth Logs**
2. Look for recent events
3. Check for errors in "Error" column

**Common Auth Errors**:
- `otp_expired`: Magic link expired (60 seconds)
- `user_already_exists`: Email already registered
- `invalid_credentials`: Wrong OTP/token

### 2. Postgres Logs

1. Go to **Dashboard → Logs → Postgres Logs**
2. Filter by "Error" level
3. Look for:
   - `infinite recursion detected`
   - `violates not-null constraint`
   - `violates row-level security policy`

### 3. API Logs

1. Go to **Dashboard → Logs → API Logs**
2. Look for failed requests (400, 500 status)
3. Check request/response bodies

---

## Step-by-Step Debugging Workflow

### When Registration Fails

1. **Check Console** for JavaScript errors
2. **Check Network tab** for failed requests
3. **Check Supabase Auth Logs** for auth errors
4. **Run validation query #4** (test insert) to verify schema

### When Magic Link Fails

1. **Check if link expired** (60 second timeout)
2. **Check callback logs** in browser console
3. **Check if code parameter** is in URL
4. **Verify callback route** exists

### When Profile Creation Fails

1. **Run validation query #1** to check schema
2. **Run validation query #2** to check RLS policies
3. **Check if user is authenticated** (browser console)
4. **Try direct insert** with validation query #4

### When You Get Infinite Recursion

1. **Run validation query #2** to see current policies
2. **Look for policies with** `NOT EXISTS` or `SELECT` in qual/with_check
3. **Drop ALL policies**:
   ```sql
   DO $$
   DECLARE pol RECORD;
   BEGIN
     FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
     LOOP
       EXECUTE format('DROP POLICY %I ON profiles', pol.policyname);
     END LOOP;
   END $$;
   ```
4. **Recreate simple policies** from migration

---

## Quick Fix Commands

### Fix Phone NOT NULL

```sql
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
```

### Fix Email Column Missing

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
```

### Fix Language Type

```sql
ALTER TABLE profiles ALTER COLUMN preferred_language TYPE TEXT USING preferred_language::TEXT;
```

### Drop All Policies

```sql
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON profiles', pol.policyname);
  END LOOP;
END $$;
```

### Recreate Simple Policies

```sql
CREATE POLICY "simple_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "simple_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "simple_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "simple_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE POLICY "service_all" ON profiles TO service_role USING (true) WITH CHECK (true);
```

---

## Clean Slate Reset

**If everything is broken, start fresh**:

```sql
-- 1. Drop the table (CAUTION: Deletes all data!)
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Recreate with correct schema
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'contractor',
  phone TEXT,  -- NULL allowed
  email TEXT,  -- NULL allowed
  full_name TEXT NOT NULL,
  preferred_language TEXT DEFAULT 'ar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT check_language_valid CHECK (preferred_language IN ('ar', 'en'))
);

-- 3. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policies
CREATE POLICY "simple_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "simple_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "simple_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "simple_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE POLICY "service_all" ON profiles TO service_role USING (true) WITH CHECK (true);

-- 5. Create indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);
```

---

## Success Indicators

✅ **All these should return TRUE/YES/SUCCESS**:

1. `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone'` → **YES**
2. `SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles'` → **5**
3. `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'upsert_profile')` → **true**
4. Direct INSERT with NULL phone → **✅ SUCCESS**
5. No errors in Supabase Postgres logs
6. Browser console shows no red errors
7. Network tab shows no 500 errors

When ALL indicators are green, authentication is working correctly!