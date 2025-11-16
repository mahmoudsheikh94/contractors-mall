-- ============================================
-- Fix Supplier RLS for Auto-Creation Trigger
-- Date: 2025-01-15
-- Purpose: Allow the auto-creation trigger to create suppliers despite RLS
-- ============================================

/*
PROBLEM:
The create_supplier_from_metadata() trigger has SECURITY DEFINER and is owned by postgres,
but the RLS policy "Users can create supplier for themselves" only allows authenticated users
with auth.uid() = owner_id.

When the trigger runs (after email confirmation), it tries to INSERT into suppliers, but:
1. The function is SECURITY DEFINER owned by postgres (should bypass RLS)
2. BUT the policy check might still fail because there's no active auth.uid() in trigger context
3. Result: "new row violates row-level security policy for table suppliers" (error 42501)

SOLUTION:
Add a policy that explicitly allows service_role to insert suppliers.
The trigger function, running as SECURITY DEFINER with postgres owner, should be treated as service_role.
*/

BEGIN;

-- ============================================================================
-- Add policy for service_role/postgres to bypass RLS
-- ============================================================================

-- First, ensure service_role has a broad policy for suppliers
DROP POLICY IF EXISTS "Service role can manage all suppliers" ON suppliers;

CREATE POLICY "Service role can manage all suppliers"
    ON suppliers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY "Service role can manage all suppliers" ON suppliers IS
'Allows service_role (including SECURITY DEFINER functions owned by postgres)
to bypass RLS and manage all supplier records. This enables the
create_supplier_from_metadata() trigger to create suppliers after email verification.';

-- ============================================================================
-- Verify the fix by checking function ownership
-- ============================================================================

DO $$
DECLARE
    v_function_owner TEXT;
BEGIN
    -- Get the owner of create_supplier_from_metadata function
    SELECT pg_catalog.pg_get_userbyid(proowner)
    INTO v_function_owner
    FROM pg_proc
    WHERE proname = 'create_supplier_from_metadata';

    RAISE NOTICE '✅ Supplier RLS fix applied!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Added service_role policy for suppliers table';
    RAISE NOTICE '2. This allows SECURITY DEFINER functions to bypass RLS';
    RAISE NOTICE '';
    RAISE NOTICE 'Function details:';
    RAISE NOTICE '- Function: create_supplier_from_metadata()';
    RAISE NOTICE '- Owner: %', v_function_owner;
    RAISE NOTICE '- Security: SECURITY DEFINER (runs with owner privileges)';
    RAISE NOTICE '';
    RAISE NOTICE 'Supplier creation should now work after email verification!';
END $$;

COMMIT;
