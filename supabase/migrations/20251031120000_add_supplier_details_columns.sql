-- ============================================
-- Add Detailed Supplier Information Columns
-- Date: 2025-10-31
-- Purpose: Add license, tax, and address detail columns
-- ============================================

BEGIN;

-- Add business registration details
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS tax_number TEXT;

-- Add detailed address fields (in addition to combined address)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS building TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_license ON suppliers(license_number);

-- Add comments
COMMENT ON COLUMN suppliers.license_number IS 'Business license/registration number';
COMMENT ON COLUMN suppliers.tax_number IS 'Tax identification number';
COMMENT ON COLUMN suppliers.city IS 'City name (e.g., Amman, Aqaba)';
COMMENT ON COLUMN suppliers.district IS 'District/neighborhood name';
COMMENT ON COLUMN suppliers.street IS 'Street name';
COMMENT ON COLUMN suppliers.building IS 'Building number or name';

-- Verification
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'suppliers'
    AND column_name IN ('license_number', 'tax_number', 'city', 'district', 'street', 'building');

  IF col_count = 6 THEN
    RAISE NOTICE '✅ All 6 columns added successfully!';
  ELSE
    RAISE WARNING '⚠️  Only % columns were added!', col_count;
  END IF;
END $$;

COMMIT;
