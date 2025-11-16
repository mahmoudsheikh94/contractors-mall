-- ============================================
-- Supplier Registration Temporary Storage
-- Date: 2025-01-15
-- Purpose: Store supplier registration data temporarily until email verification
-- ============================================

BEGIN;

-- Create table to temporarily store supplier registration data
CREATE TABLE IF NOT EXISTS public.supplier_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_name_en TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT NOT NULL,
  tax_number TEXT,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  street TEXT NOT NULL,
  building TEXT,
  zone_a_radius DECIMAL(5,2) NOT NULL DEFAULT 10,
  zone_b_radius DECIMAL(5,2) NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.supplier_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert their own registration data (before email verification)
CREATE POLICY "Users can insert their own registration"
  ON supplier_registrations FOR INSERT
  TO public
  WITH CHECK (true);  -- Allow insert even without auth (pre-verification)

-- Policy: Service role can read all
CREATE POLICY "Service role can manage all"
  ON supplier_registrations FOR ALL
  TO service_role
  USING (true);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_supplier_registrations_user_id
  ON supplier_registrations(user_id);

-- Update the trigger to read from this table instead of metadata
DROP TRIGGER IF EXISTS on_supplier_user_verified ON auth.users;
DROP FUNCTION IF EXISTS public.create_supplier_from_metadata();

CREATE OR REPLACE FUNCTION public.create_supplier_from_registration()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_reg_data RECORD;
  v_address TEXT;
BEGIN
  -- Only proceed if this is a supplier_admin and email was just verified
  IF NEW.raw_user_meta_data->>'role' = 'supplier_admin'
     AND NEW.email_confirmed_at IS NOT NULL
  THEN
    -- Get registration data from temporary table
    SELECT * INTO v_reg_data
    FROM supplier_registrations
    WHERE user_id = NEW.id;

    -- Only proceed if registration data exists
    IF FOUND THEN
      -- Combine address fields
      v_address := CONCAT_WS(', ',
        v_reg_data.building,
        v_reg_data.street,
        v_reg_data.district,
        v_reg_data.city
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
          v_reg_data.business_name,
          COALESCE(v_reg_data.business_name_en, v_reg_data.business_name),
          v_reg_data.phone,
          v_reg_data.email,
          v_reg_data.license_number,
          v_reg_data.tax_number,
          v_address,
          v_reg_data.city,
          v_reg_data.district,
          v_reg_data.street,
          v_reg_data.building,
          31.9539,  -- Default to Amman center
          35.9106,
          v_reg_data.zone_a_radius,
          v_reg_data.zone_b_radius,
          false  -- Admin must verify
        );

        -- Delete the temporary registration data
        DELETE FROM supplier_registrations WHERE user_id = NEW.id;

        RAISE NOTICE 'Supplier record created for user % from registration table', NEW.id;
      END IF;
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
ALTER FUNCTION public.create_supplier_from_registration() OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_supplier_from_registration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_from_registration() TO service_role;

-- Create trigger that fires AFTER email confirmation
CREATE TRIGGER on_supplier_user_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.create_supplier_from_registration();

-- Add comments
COMMENT ON TABLE supplier_registrations IS
'Temporary storage for supplier registration data until email verification.
Data is moved to suppliers table by trigger after email confirmation.';

COMMENT ON FUNCTION public.create_supplier_from_registration() IS
'Trigger function that creates supplier records from supplier_registrations table.
Runs as SECURITY DEFINER with postgres owner to bypass RLS policies.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Supplier registration table created';
  RAISE NOTICE '';
  RAISE NOTICE 'Table: supplier_registrations';
  RAISE NOTICE 'Purpose: Store supplier data temporarily before email verification';
  RAISE NOTICE 'Trigger: on_supplier_user_verified';
  RAISE NOTICE 'Action: Moves data from supplier_registrations → suppliers after verification';
  RAISE NOTICE '';
  RAISE NOTICE 'This solves the user_metadata size limitation issue!';
END $$;

COMMIT;
