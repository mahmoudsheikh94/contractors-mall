-- ============================================
-- Dual Delivery Confirmation System
-- Date: 2025-11-10
-- Purpose: Enable both supplier AND contractor to confirm delivery
-- ============================================
--
-- CHANGES:
-- 1. Add supplier_confirmed and contractor_confirmed columns to deliveries
-- 2. Add delivery_started_at to track when supplier starts delivery
-- 3. Add new order status: 'awaiting_contractor_confirmation'
-- 4. Add indexes for performance
--
-- WORKFLOW:
-- - Supplier accepts order → status: 'confirmed'
-- - Supplier starts delivery → status: 'in_delivery', delivery_started_at set
-- - Supplier confirms delivery (photo/PIN) → supplier_confirmed = true, status: 'awaiting_contractor_confirmation'
-- - Contractor confirms delivery → contractor_confirmed = true, status: 'delivered'
-- - Payment released (if no disputes) → status: 'completed'
-- ============================================

-- Add delivery confirmation tracking columns to deliveries table
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS supplier_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS supplier_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contractor_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contractor_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMPTZ;

-- Add comment explaining the dual confirmation system
COMMENT ON COLUMN deliveries.supplier_confirmed IS 'Set to true when supplier confirms delivery via photo (<120 JOD) or PIN (≥120 JOD)';
COMMENT ON COLUMN deliveries.contractor_confirmed IS 'Set to true when contractor confirms receipt of the order';
COMMENT ON COLUMN deliveries.delivery_started_at IS 'Timestamp when supplier clicked "Start Delivery" button';

-- Add new order status value if it doesn't exist
DO $$
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status'
        AND e.enumlabel = 'awaiting_contractor_confirmation'
    ) THEN
        -- Add the new enum value
        ALTER TYPE order_status ADD VALUE 'awaiting_contractor_confirmation';

        -- Log the addition
        RAISE NOTICE 'Added new order_status value: awaiting_contractor_confirmation';
    ELSE
        RAISE NOTICE 'Order status awaiting_contractor_confirmation already exists';
    END IF;
END$$;

-- Create indexes for performance on confirmation queries
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier_confirmed
ON deliveries(supplier_confirmed, supplier_confirmed_at)
WHERE supplier_confirmed = true;

CREATE INDEX IF NOT EXISTS idx_deliveries_contractor_confirmed
ON deliveries(contractor_confirmed, contractor_confirmed_at)
WHERE contractor_confirmed = true;

CREATE INDEX IF NOT EXISTS idx_deliveries_started
ON deliveries(delivery_started_at)
WHERE delivery_started_at IS NOT NULL;

-- Create index for finding orders awaiting contractor confirmation
CREATE INDEX IF NOT EXISTS idx_deliveries_awaiting_contractor
ON deliveries(supplier_confirmed, contractor_confirmed)
WHERE supplier_confirmed = true AND contractor_confirmed = false;

-- ============================================
-- VALIDATION FUNCTION
-- ============================================
-- Function to validate delivery confirmation state
CREATE OR REPLACE FUNCTION validate_delivery_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- Contractor can only confirm if supplier confirmed first
    IF NEW.contractor_confirmed = true AND NEW.supplier_confirmed = false THEN
        RAISE EXCEPTION 'Contractor cannot confirm delivery before supplier confirms';
    END IF;

    -- If confirming, set timestamp
    IF NEW.supplier_confirmed = true AND OLD.supplier_confirmed = false THEN
        NEW.supplier_confirmed_at = NOW();
    END IF;

    IF NEW.contractor_confirmed = true AND OLD.contractor_confirmed = false THEN
        NEW.contractor_confirmed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_delivery_confirmation_trigger ON deliveries;
CREATE TRIGGER validate_delivery_confirmation_trigger
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION validate_delivery_confirmation();

-- ============================================
-- UPDATE EXISTING DELIVERIES (Data Migration)
-- ============================================
-- For existing completed deliveries, mark both as confirmed
UPDATE deliveries
SET
    supplier_confirmed = true,
    supplier_confirmed_at = COALESCE(pin_verified_at, photo_uploaded_at, completed_at),
    contractor_confirmed = true,
    contractor_confirmed_at = completed_at
WHERE completed_at IS NOT NULL;

-- ============================================
-- HELPER VIEW
-- ============================================
-- View to easily see delivery confirmation status
CREATE OR REPLACE VIEW delivery_confirmation_status AS
SELECT
    d.delivery_id,
    d.order_id,
    o.order_number,
    o.status as order_status,
    o.total_jod,
    d.supplier_confirmed,
    d.supplier_confirmed_at,
    d.contractor_confirmed,
    d.contractor_confirmed_at,
    d.delivery_started_at,
    d.completed_at,
    -- Helper flags
    CASE
        WHEN d.supplier_confirmed AND d.contractor_confirmed THEN 'fully_confirmed'
        WHEN d.supplier_confirmed AND NOT d.contractor_confirmed THEN 'awaiting_contractor'
        WHEN NOT d.supplier_confirmed THEN 'awaiting_supplier'
        ELSE 'not_started'
    END as confirmation_status,
    -- Time in each state
    CASE
        WHEN d.supplier_confirmed THEN
            EXTRACT(EPOCH FROM (COALESCE(d.contractor_confirmed_at, NOW()) - d.supplier_confirmed_at)) / 60
        ELSE NULL
    END as minutes_awaiting_contractor
FROM deliveries d
INNER JOIN orders o ON d.order_id = o.id;

-- Add comment to view
COMMENT ON VIEW delivery_confirmation_status IS 'Shows delivery confirmation status for all orders with helpful calculated fields';

-- ============================================
-- GRANTS
-- ============================================
-- Ensure authenticated users can read the view
GRANT SELECT ON delivery_confirmation_status TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- Verify the changes
DO $$
DECLARE
    col_count INTEGER;
    idx_count INTEGER;
    enum_exists BOOLEAN;
BEGIN
    -- Check if columns were added
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'deliveries'
    AND column_name IN ('supplier_confirmed', 'contractor_confirmed', 'delivery_started_at');

    -- Check if indexes were created
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE tablename = 'deliveries'
    AND indexname LIKE 'idx_deliveries_%confirmed%';

    -- Check if enum value exists
    SELECT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status'
        AND e.enumlabel = 'awaiting_contractor_confirmation'
    ) INTO enum_exists;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Confirmation columns added: %/3', col_count;
    RAISE NOTICE 'Indexes created: %', idx_count;
    RAISE NOTICE 'New order status added: %', enum_exists;
    RAISE NOTICE '===========================================';

    IF col_count = 3 AND idx_count >= 2 AND enum_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️  Migration may be incomplete. Please verify manually.';
    END IF;
END$$;
