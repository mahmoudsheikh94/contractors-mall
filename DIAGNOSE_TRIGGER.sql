-- ============================================
-- DIAGNOSTIC QUERY: Check Trigger Status
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if function exists
SELECT
    'Function Check' as check_type,
    proname as name,
    CASE
        WHEN proname = 'handle_new_user' THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status
FROM pg_proc
WHERE proname = 'handle_new_user';

-- If the above returns no rows, the function doesn't exist

-- 2. Check if trigger exists
SELECT
    'Trigger Check' as check_type,
    trigger_name as name,
    event_object_table as table_name,
    action_timing as timing,
    event_manipulation as event,
    CASE
        WHEN trigger_name = 'on_auth_user_created' THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- If the above returns no rows, the trigger doesn't exist

-- 3. Check auth schema permissions
SELECT
    'Permission Check' as check_type,
    has_schema_privilege('auth', 'USAGE') as can_access_auth_schema,
    has_table_privilege('auth.users', 'SELECT') as can_read_users_table;

-- 4. List all triggers on auth.users (to see what exists)
SELECT
    'Existing Triggers' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 5. Check if profiles table exists and has correct structure
SELECT
    'Profiles Table' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
