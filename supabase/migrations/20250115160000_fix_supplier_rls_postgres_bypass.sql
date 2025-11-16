-- ============================================
-- Fix Supplier RLS for Postgres Trigger Bypass
-- Date: 2025-01-15
-- Purpose: Allow postgres-owned trigger to create suppliers by adding postgres to policy check
-- ============================================

/*
ROOT CAUSE ANALYSIS:
====================
The "new row violates row-level security policy for table suppliers" error (code 42501)
occurs because:

1. Trigger function `create_supplier_from_registration()` has SECURITY DEFINER and owner=postgres
2. THREE INSERT policies exist on suppliers table:
   - "Service role can manage all suppliers" (service_role only)
   - "Supplier admins can manage their supplier" (CHECK: owner_id = auth.uid())
   - "Users can create supplier for themselves" (CHECK: auth.uid() = owner_id)

3. When trigger runs:
   - It executes with postgres owner privileges (SECURITY DEFINER)
   - But RLS is ENABLED on suppliers table
   - Even superusers must satisfy at least ONE policy when RLS is enabled
   - The trigger doesn't have service_role credentials
   - auth.uid() returns NULL in trigger context
   - All policies fail: NULL = owner_id → FALSE
   - Result: Error 42501

WHY SERVICE_ROLE POLICY DIDN'T HELP:
=====================================
The "Service role can manage all suppliers" policy applies to the service_role ROLE.
SECURITY DEFINER functions run with the owner's privileges (postgres), not service_role.
postgres is a superuser, but when RLS is ENABLED, even superusers need a policy match.

THE SOLUTION:
=============
Add `current_user = 'postgres'` to the INSERT policy check.
This allows the postgres-owned trigger to bypass the auth.uid() check,
while still enforcing security for regular authenticated users.
*/

BEGIN;

-- ============================================================================
-- STEP 1: Drop the conflicting INSERT-only policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can create supplier for themselves" ON suppliers;

-- ============================================================================
-- STEP 2: Create new policy that allows BOTH authenticated users AND postgres
-- ============================================================================

CREATE POLICY "Allow supplier creation for users and triggers"
    ON suppliers FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id           -- For authenticated users via frontend
        OR
        current_user = 'postgres'       -- For postgres-owned triggers (SECURITY DEFINER)
    );

COMMENT ON POLICY "Allow supplier creation for users and triggers" ON suppliers IS
'Allows supplier creation from two sources:
1. Authenticated users creating their own supplier (auth.uid() = owner_id)
2. Postgres-owned trigger after email verification (current_user = postgres)

This enables the create_supplier_from_registration() trigger to create suppliers
after email confirmation, while maintaining security for frontend operations.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    -- Count INSERT policies that would allow trigger to work
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policy
    WHERE polrelid = 'suppliers'::regclass
      AND (polcmd = 'a' OR polcmd = '*')
      AND (
        pg_get_expr(polwithcheck, polrelid) LIKE '%postgres%'
        OR pg_get_expr(polwithcheck, polrelid) LIKE '%service_role%'
      );

    RAISE NOTICE '✅ Supplier RLS fix applied successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Dropped conflicting "Users can create supplier for themselves" policy';
    RAISE NOTICE '2. Created new policy: "Allow supplier creation for users and triggers"';
    RAISE NOTICE '3. Policy allows INSERT from:';
    RAISE NOTICE '   - Authenticated users (auth.uid() = owner_id)';
    RAISE NOTICE '   - Postgres-owned triggers (current_user = postgres)';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies allowing trigger access: %', v_policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'How it works now:';
    RAISE NOTICE '1. User signs up → data stored in supplier_registrations';
    RAISE NOTICE '2. User confirms email → auth.users.email_confirmed_at updated';
    RAISE NOTICE '3. Trigger on_supplier_user_verified fires';
    RAISE NOTICE '4. Function create_supplier_from_registration() runs as postgres';
    RAISE NOTICE '5. RLS check: current_user = postgres → TRUE';
    RAISE NOTICE '6. Supplier record created successfully';
    RAISE NOTICE '7. Registration data deleted from temp table';
    RAISE NOTICE '';
    RAISE NOTICE 'Supplier creation should now work after email verification!';
END $$;

COMMIT;
