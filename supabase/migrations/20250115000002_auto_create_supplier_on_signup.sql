-- ============================================
-- Auto-create Supplier Record on Signup
-- Date: 2025-01-15
-- Purpose: Automatically create supplier record from user metadata after email verification
-- ============================================

BEGIN;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_supplier_user_verified ON auth.users;
DROP FUNCTION IF EXISTS public.create_supplier_from_metadata();

-- Create function to auto-create supplier from user metadata
CREATE OR REPLACE FUNCTION public.create_supplier_from_metadata()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_supplier_data JSONB;
  v_address TEXT;
BEGIN
  -- Only proceed if this is a supplier_admin with supplier_data in metadata
  IF NEW.raw_user_meta_data->>'role' = 'supplier_admin'
     AND NEW.raw_user_meta_data->'supplier_data' IS NOT NULL
     AND NEW.email_confirmed_at IS NOT NULL  -- Only after email verification
  THEN
    -- Get supplier data from metadata
    v_supplier_data := NEW.raw_user_meta_data->'supplier_data';

    -- Combine address fields
    v_address := CONCAT_WS(', ',
      v_supplier_data->>'building',
      v_supplier_data->>'street',
      v_supplier_data->>'district',
      v_supplier_data->>'city'
    );

    -- Check if supplier record already exists
    IF NOT EXISTS (SELECT 1 FROM suppliers WHERE owner_id = NEW.id) THEN
      -- Create supplier record (RLS bypassed due to SECURITY DEFINER + postgres owner)
      INSERT INTO suppliers (
        owner_id,
        business_name,
        business_name_en,
        phone,
        email,
        license_number,
        tax_number,
        address,
        city,
        district,
        street,
        building,
        latitude,
        longitude,
        radius_km_zone_a,
        radius_km_zone_b,
        is_verified
      ) VALUES (
        NEW.id,
        v_supplier_data->>'business_name',
        COALESCE(v_supplier_data->>'business_name_en', v_supplier_data->>'business_name'),
        v_supplier_data->>'phone',
        v_supplier_data->>'email',
        v_supplier_data->>'license_number',
        v_supplier_data->>'tax_number',
        v_address,
        v_supplier_data->>'city',
        v_supplier_data->>'district',
        v_supplier_data->>'street',
        v_supplier_data->>'building',
        31.9539,  -- Default to Amman center
        35.9106,
        (v_supplier_data->>'zone_a_radius')::DECIMAL,
        (v_supplier_data->>'zone_b_radius')::DECIMAL,
        false  -- Admin must verify
      );

      RAISE NOTICE 'Supplier record created for user %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Supplier creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Set function owner to postgres (superuser who can bypass RLS)
ALTER FUNCTION public.create_supplier_from_metadata() OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_supplier_from_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_from_metadata() TO service_role;

-- Create trigger that fires AFTER email confirmation
-- This trigger fires on UPDATE when email_confirmed_at changes from NULL to a value
CREATE TRIGGER on_supplier_user_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.create_supplier_from_metadata();

-- Add comment
COMMENT ON FUNCTION public.create_supplier_from_metadata() IS
'Trigger function that automatically creates supplier records on email verification.
Runs as SECURITY DEFINER with postgres owner to bypass RLS policies.
Reads supplier data from user_metadata set during signup.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Supplier auto-creation trigger installed';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger: on_supplier_user_verified';
  RAISE NOTICE 'Fires: AFTER UPDATE OF email_confirmed_at ON auth.users';
  RAISE NOTICE 'When: email goes from NULL to confirmed';
  RAISE NOTICE 'Action: Creates supplier record from user_metadata->supplier_data';
  RAISE NOTICE '';
  RAISE NOTICE 'This eliminates RLS issues in the auth callback!';
END $$;

COMMIT;
