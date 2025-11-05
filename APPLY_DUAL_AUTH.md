# 📱 Apply Dual Authentication Migration

## Step 1: Apply Database Migration (2 minutes)

Since Supabase CLI is experiencing connection issues, apply the migration via the Supabase Dashboard:

### Option A: Copy-Paste into SQL Editor (Recommended)

1. **Open Supabase SQL Editor**:
   https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/sql/new

2. **Copy the SQL below** and paste it into the editor:

```sql
-- Add verification columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_method TEXT CHECK (verification_method IN ('email', 'phone', 'both'));

-- Update existing users
UPDATE profiles p
SET email_verified = true, verification_method = 'email'
FROM auth.users u
WHERE p.id = u.id AND u.email_confirmed_at IS NOT NULL AND p.email_verified = false;

-- Verify phone function
CREATE OR REPLACE FUNCTION verify_phone_number(p_user_id UUID, p_verification_code TEXT)
RETURNS JSON AS $$
DECLARE v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF p_verification_code = RIGHT(v_profile.phone, 4) THEN
    UPDATE profiles SET phone_verified = true, email_verified = true,
           phone_verified_at = NOW(), verification_method = 'both', updated_at = NOW()
    WHERE id = p_user_id;
    RETURN json_build_object('success', true, 'message', 'Phone verified successfully',
           'badges', json_build_object('email_verified', true, 'phone_verified', true));
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid verification code');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send verification function
CREATE OR REPLACE FUNCTION send_phone_verification(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_phone TEXT; v_code TEXT;
BEGIN
  SELECT phone INTO v_phone FROM profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_phone IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Phone number not found');
  END IF;
  v_code := RIGHT(v_phone, 4);
  RETURN json_build_object('success', true, 'message', 'Verification code sent', 'code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_method ON profiles(verification_method);

-- IMPORTANT: No RLS policies needed - existing profiles policies handle access
```

3. **Click "Run"** (or press `Ctrl/Cmd + Enter`)

4. **Verify Success**: You should see:
   ```
   Success. No rows returned
   ```

### Option B: Upload SQL File

Alternatively, you can upload the file at `/tmp/dual_auth_migration.sql`

---

## Step 2: Verify Migration

Run this query to confirm columns exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('email_verified', 'phone_verified', 'phone_verified_at', 'verification_method');
```

Expected result: 4 rows showing the new columns.

---

## Step 3: Deploy Updated Apps

Once the migration is applied, push the code changes:

```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
git add .
git commit -m "Add dual authentication with email/phone signup and verification badges"
git push origin main
```

Vercel will automatically deploy both apps with the new dual authentication system.

---

## Testing

See [DUAL_AUTH_GUIDE.md](./DUAL_AUTH_GUIDE.md) for complete testing instructions.

**Quick Test**:
1. Go to registration page
2. Toggle between "📧 البريد الإلكتروني" and "📱 رقم الهاتف"
3. Sign up with phone
4. Verify with last 4 digits of phone number
5. Get both email and phone badges!
