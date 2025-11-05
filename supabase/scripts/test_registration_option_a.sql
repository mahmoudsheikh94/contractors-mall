-- ============================================
-- TEST REGISTRATION AFTER OPTION A FIX
-- ============================================
-- Run this after disabling email confirmations

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '  TESTING REGISTRATION - OPTION A';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prerequisites:';
  RAISE NOTICE '   1. Email confirmations DISABLED in Dashboard';
  RAISE NOTICE '   2. Browser storage cleared';
  RAISE NOTICE '   3. Using a NEW email address';
  RAISE NOTICE '';
END $$;

-- ============================================
-- 1. Check Email Confirmation Setting
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '1️⃣  Checking authentication configuration...';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: This query cannot check Dashboard settings!';
  RAISE NOTICE 'Please verify manually that email confirmations are OFF.';
  RAISE NOTICE '';
END $$;

-- ============================================
-- 2. Check RLS Policies are Ready
-- ============================================

DO $$
DECLARE
  profiles_policies INTEGER;
  suppliers_policies INTEGER;
BEGIN
  RAISE NOTICE '2️⃣  Checking RLS policies...';

  SELECT COUNT(*) INTO profiles_policies
  FROM pg_policies
  WHERE tablename = 'profiles';

  SELECT COUNT(*) INTO suppliers_policies
  FROM pg_policies
  WHERE tablename = 'suppliers';

  RAISE NOTICE '   Profiles policies: %', profiles_policies;
  RAISE NOTICE '   Suppliers policies: %', suppliers_policies;

  IF profiles_policies >= 3 AND suppliers_policies >= 2 THEN
    RAISE NOTICE '   ✅ Policies look good!';
  ELSE
    RAISE WARNING '   ⚠️  Some policies may be missing!';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- 3. Clean Test Data (Optional)
-- ============================================

-- Uncomment to delete test user data (replace email)
/*
DO $$
DECLARE
  test_email TEXT := 'test@example.com'; -- Change this!
  user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id
  FROM profiles
  WHERE email = test_email;

  IF user_id IS NOT NULL THEN
    -- Delete in correct order (respect foreign keys)
    DELETE FROM suppliers WHERE owner_id = user_id;
    DELETE FROM profiles WHERE id = user_id;
    -- Note: Cannot delete from auth.users via SQL
    RAISE NOTICE 'Cleaned test data for: %', test_email;
  ELSE
    RAISE NOTICE 'No test data found for: %', test_email;
  END IF;
END $$;
*/

-- ============================================
-- 4. Test Checklist
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '  MANUAL TESTING CHECKLIST';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Clear browser storage:';
  RAISE NOTICE '   - Open DevTools (F12)';
  RAISE NOTICE '   - Application tab → Storage → Clear site data';
  RAISE NOTICE '';
  RAISE NOTICE '2. Go to registration page:';
  RAISE NOTICE '   http://localhost:3001/auth/register';
  RAISE NOTICE '';
  RAISE NOTICE '3. Fill out the form:';
  RAISE NOTICE '   - Use a NEW email (not previously registered)';
  RAISE NOTICE '   - Fill all required fields';
  RAISE NOTICE '   - Submit the form';
  RAISE NOTICE '';
  RAISE NOTICE '4. Expected results:';
  RAISE NOTICE '   ✅ NO "42501" RLS error';
  RAISE NOTICE '   ✅ Redirected to login page';
  RAISE NOTICE '   ✅ Success message shown';
  RAISE NOTICE '   ✅ NO confirmation email sent';
  RAISE NOTICE '';
  RAISE NOTICE '5. Test login:';
  RAISE NOTICE '   - Login with same credentials';
  RAISE NOTICE '   ✅ Should see supplier dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '6. Verify in Supabase Dashboard:';
  RAISE NOTICE '   - Authentication tab: User exists';
  RAISE NOTICE '   - Table Editor → profiles: Record exists';
  RAISE NOTICE '   - Table Editor → suppliers: Record exists';
  RAISE NOTICE '';
END $$;

-- ============================================
-- 5. Quick Data Verification
-- ============================================

-- Check recent registrations
SELECT
  'Recent Profiles (Last 24 hours)' as check_type,
  COUNT(*) as count
FROM profiles
WHERE created_at > NOW() - INTERVAL '24 hours';

SELECT
  'Recent Suppliers (Last 24 hours)' as check_type,
  COUNT(*) as count
FROM suppliers
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Show last 3 profiles
SELECT
  email,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 3;