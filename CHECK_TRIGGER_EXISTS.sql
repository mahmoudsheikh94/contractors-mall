-- Check if the trigger actually exists
SELECT
    trigger_name,
    event_object_schema,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- If this returns 0 rows, the trigger was NOT created
-- This likely means Supabase doesn't allow triggers on auth.users
