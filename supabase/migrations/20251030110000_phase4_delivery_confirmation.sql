-- ============================================
-- Phase 4: Delivery & Confirmation - Database Updates
-- Date: 2025-10-30
-- ============================================

-- Add delivery confirmation fields to deliveries table
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_verified_at TIMESTAMPTZ;

-- Add dispute fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN deliveries.photo_url IS 'URL of delivery proof photo (for orders < 120 JOD)';
COMMENT ON COLUMN deliveries.photo_uploaded_at IS 'Timestamp when photo proof was uploaded';
COMMENT ON COLUMN deliveries.pin_attempts IS 'Number of PIN verification attempts (max 3)';
COMMENT ON COLUMN deliveries.pin_verified_at IS 'Timestamp when PIN was successfully verified';
COMMENT ON COLUMN orders.disputed_at IS 'Timestamp when order was disputed';
COMMENT ON COLUMN orders.dispute_reason IS 'Contractor description of the dispute';

-- Update payment status enum to include 'frozen' (for disputed orders)
-- Note: This assumes payment.status is a text column, not an enum
-- If it's an enum type, we'll need to use ALTER TYPE

-- Add index for faster dispute queries
CREATE INDEX IF NOT EXISTS idx_orders_disputed_at ON orders(disputed_at) WHERE disputed_at IS NOT NULL;

-- Add index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Add constraint: PIN attempts cannot exceed 3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_pin_attempts_max'
    AND table_name = 'deliveries'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT chk_pin_attempts_max CHECK (pin_attempts <= 3);
  END IF;
END $$;

-- Add constraint: Either photo OR PIN verification, not both
-- (This is a business logic check - orders < 120 use photo, >= 120 use PIN)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_delivery_confirm_method'
    AND table_name = 'deliveries'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT chk_delivery_confirm_method
      CHECK (
        (photo_uploaded_at IS NULL OR pin_verified_at IS NULL)
      );
  END IF;
END $$;

-- Create Supabase Storage bucket for delivery photos (if not exists)
-- Note: This is handled via Supabase Dashboard or API, not SQL
-- Bucket name: 'deliveries'
-- Public: true (for contractor to view proof)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
