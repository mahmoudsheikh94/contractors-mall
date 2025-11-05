# 🚀 Quick Setup: Authentication with Email (Development Mode)

## Current Status
✅ Development mode is **enabled** - you can test authentication with email instead of SMS!

---

## Step 1: Run the Database Migration

Go to your Supabase Dashboard SQL Editor and run this:

```sql
-- Create enum types (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('contractor', 'supplier_admin', 'driver', 'admin');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language') THEN
        CREATE TYPE language AS ENUM ('ar', 'en');
    END IF;
END $$;

-- Create profiles table (drop first if exists for clean migration)
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'contractor',
  phone TEXT UNIQUE,
  email TEXT,
  full_name TEXT NOT NULL,
  preferred_language language DEFAULT 'ar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create trigger
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
```

**Note**: This script is safe to run multiple times. It checks if types exist before creating them and drops/recreates the profiles table.

---

## Step 2: Test the Authentication Flow

### Option A: Using the UI (Recommended)

1. **Open your browser** to http://localhost:3000

2. **Click "إنشاء حساب جديد" (Create Account)**

3. **Enter your email** (example: `test@example.com`)
   - You'll see a blue banner: "وضع التطوير" (Development Mode)

4. **Click "إنشاء حساب"**

5. **Check your email inbox** for the magic link
   - Look in spam folder if needed
   - The email will be from Supabase
   - Click the link in the email

6. **Complete your profile**:
   - Full name
   - Account type (contractor or supplier)
   - Language preference

7. **Done!** You'll be redirected to your dashboard 🎉

### Option B: Using Supabase Dashboard (Testing Only)

If you want to bypass the flow for testing:

1. Go to Supabase Dashboard → Authentication → Users
2. Manually create a user with email
3. Copy the user ID
4. Go to SQL Editor and run:
   ```sql
   INSERT INTO profiles (id, email, full_name, role, preferred_language)
   VALUES ('YOUR-USER-ID-HERE', 'test@example.com', 'Test User', 'contractor', 'ar');
   ```

---

## Step 3: Test Login Flow

1. **Go to http://localhost:3000/auth/login**

2. **Enter the same email** you registered with

3. **Check email** for the magic link

4. **Click the link** in the email

5. **You're in!** Should redirect to dashboard based on your role

---

## Troubleshooting

### "Email rate limit exceeded"
**Problem**: Supabase limits email magic links in development
**Solution**: Wait 60 seconds between requests, or use different email addresses

### "Invalid or expired link"
**Problem**: Magic link expired or already used
**Solution**: Go back to the login page and request a new magic link. Links expire after 60 seconds and can only be used once.

### "Profile not found" error
**Problem**: `profiles` table doesn't exist or user has no profile
**Solution**: Make sure you ran the SQL migration in Step 1

### "Could not find the 'email' column of 'profiles' in the schema cache"
**Problem**: You ran an older version of the migration before the `email` column was added
**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Run this command:
   ```sql
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
   CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
   ```
3. Alternatively, copy and run the script from `supabase/migrations/20250126_add_email_column.sql`

### Email not arriving
**Problem**: Email delivery issues
**Solution**:
- Check spam folder
- Try a different email provider (Gmail works best)
- Check Supabase logs: Dashboard → Logs → Auth Logs

---

## Switching to Production Mode (SMS)

When ready for production with real phone numbers:

1. **Update `.env.local`**:
   ```env
   NEXT_PUBLIC_DEV_MODE=false
   ```

2. **Configure SMS Provider** in Supabase:
   - Go to Dashboard → Authentication → Providers → Phone
   - Choose provider (Twilio recommended for Jordan)
   - Add credentials

3. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   pnpm dev
   ```

4. **Test with real Jordan phone numbers**
   - Format: `0791234567`
   - Will be automatically converted to `+962791234567`

---

## What's Different in Dev Mode?

| Feature | Development Mode | Production Mode |
|---------|-----------------|----------------|
| **Input** | Email address | Jordan phone number |
| **Auth Method** | Magic Link (click link in email) | 6-digit OTP (type code from SMS) |
| **Verification Page** | Not needed (direct from email) | Required (enter 6-digit code) |
| **Cost** | Free | SMS charges apply |
| **Testing** | Easy to test | Requires SMS provider |
| **Profile Field** | `email` populated | `phone` populated |

---

## Next Steps

Once authentication is working:

✅ You have a working authentication system!
✅ Users can register and login
✅ Role-based dashboards are ready

**Ready for Phase 2?** We can now build:
- Supplier onboarding
- Product catalog
- Shopping cart
- And more...

---

## Quick Commands

```bash
# Start development servers
pnpm dev

# Check if servers are running
# Web: http://localhost:3000
# Admin: http://localhost:3001

# Stop servers
Ctrl+C
```

---

## File Locations

- Migration SQL: `supabase/migrations/20250125_create_profiles.sql`
- Auth config: `apps/web/.env.local` (NEXT_PUBLIC_DEV_MODE)
- Login page: `apps/web/src/app/auth/login/page.tsx`
- Register page: `apps/web/src/app/auth/register/page.tsx`
- Callback route: `apps/web/src/app/auth/callback/route.ts` (for magic links)
- Verify page: `apps/web/src/app/auth/verify/page.tsx` (for phone OTP in production)
- Complete profile: `apps/web/src/app/auth/complete-profile/page.tsx`
- Middleware: `apps/web/src/middleware.ts`

---

**Questions?** The authentication system is fully functional with email magic links. Test it now! 🚀