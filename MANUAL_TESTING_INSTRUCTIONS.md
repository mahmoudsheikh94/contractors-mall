# 🧪 Manual Testing Instructions

## Why Manual Testing is Needed

The automated curl tests bypass the frontend code where manual profile creation happens. The profile creation logic is in the **Next.js page components**, not the API layer.

---

## Test via Deployed Apps (Vercel)

Once Vercel finishes deploying (commit `103f976`), test these flows:

###  1️⃣ Supplier Email Signup

**URL:** https://admin.contractors-mall.vercel.app/auth/register

1. Choose "📧 البريد الإلكتروني" (Email)
2. Fill in:
   - Business Name: Test Supplier
   - Email: test_supplier_$(date +%s)@example.com
   - Phone: 0791234567
   - Password: TestPass123
   - Confirm Password: TestPass123
   - Fill in address fields
3. Click "إنشاء حساب"
4. **Expected:** Success message, no errors
5. **Verify:** Check Supabase profiles table for the new user

### 2️⃣ Supplier Phone Signup

**URL:** https://admin.contractors-mall.vercel.app/auth/register

1. Choose "📱 رقم الهاتف" (Phone)
2. Fill in:
   - Business Name: Test Supplier Phone
   - Phone: 0792222222
   - Password: TestPass123
   - Fill in address fields
3. Click "إنشاء حساب"
4. **Expected:** Success message
5. **Verify:** Profile created with temp email `9627*@contractors-mall.local`

### 3️⃣ Contractor Email Signup

**URL:** https://contractors-mall.vercel.app/auth/register

1. Choose "📧 البريد الإلكتروني" (Email)
2. Fill in:
   - Full Name: Test Contractor
   - Phone: 0793333333
   - Email: test_contractor_$(date +%s)@example.com
   - Password: TestPass123
3. Click "إنشاء حساب"
4. **Expected:** Success message about email verification
5. **Verify:** Profile created with role='contractor'

### 4️⃣ Contractor Phone Signup

**URL:** https://contractors-mall.vercel.app/auth/register

1. Choose "📱 رقم الهاتف" (Phone)
2. Fill in:
   - Full Name: Test Contractor Phone
   - Phone: 0794444444
3. Click "إنشاء حساب"
4. **Expected:** Redirect to verification page
5. **Verify:** Profile created with temp email and phone_verified=false

---

## Test via Local Development

**Servers are running at:**
- Admin app: http://localhost:3001
- Web app: http://localhost:3000

Follow the same test steps above, but use localhost URLs.

---

## Verification Queries

After each signup, run this in Supabase SQL Editor:

```sql
-- Get most recent 5 users with their profiles
SELECT
    u.id,
    u.email,
    u.created_at as user_created,
    p.id as profile_id,
    p.role,
    p.full_name,
    p.phone,
    p.email_verified,
    p.phone_verified
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;
```

**Expected result:** Every user should have a matching `profile_id` (not null).

---

## Success Criteria

✅ All 4 signup flows complete without errors
✅ Profiles are created for all users
✅ Roles are set correctly (supplier_admin vs contractor)
✅ Email/phone fields populated correctly
✅ Verification flags set appropriately

---

##  What the Code Does

1. **Try trigger first:** Wait 1.5-2.5 seconds for database trigger
2. **Check if profile exists:** Query profiles table
3. **Fallback to manual:** If no profile, create it via client-side insert
4. **Continue flow:** Proceed with supplier record creation or redirect

This hybrid approach works whether the trigger is enabled or not!
