-- ============================================
-- Payment System Tables
-- ============================================
-- Adds comprehensive payment tracking and management
-- Date: January 14, 2025
-- Phase: 1.5 - Payment Gateway Integration

BEGIN;

-- ============================================
-- 1. Payment Transactions Table
-- ============================================
-- Tracks all payment transactions

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order relationship
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  -- Customer info
  customer_id UUID REFERENCES profiles(id),
  customer_email TEXT,
  customer_phone TEXT,

  -- Transaction details
  amount INTEGER NOT NULL, -- In fils (1 JOD = 1000 fils)
  currency TEXT NOT NULL DEFAULT 'JOD',
  status TEXT NOT NULL DEFAULT 'pending',

  -- Payment method
  payment_method TEXT,
  card_brand TEXT,
  card_last4 TEXT,

  -- Provider info
  provider TEXT NOT NULL DEFAULT 'mock', -- hyperpay, paytabs, tap, mock
  psp_transaction_id TEXT,
  psp_response JSONB,

  -- Escrow details
  escrow_release_date TIMESTAMPTZ,
  supplier_amount INTEGER,
  platform_amount INTEGER,
  commission_rate DECIMAL(5,2),

  -- Refund info
  refunded_amount INTEGER DEFAULT 0,
  refund_reason TEXT,

  -- Dispute info
  dispute_id UUID,
  disputed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN (
      'pending', 'authorized', 'captured', 'released',
      'refunded', 'partially_refunded', 'failed', 'cancelled', 'disputed'
    )
  ),
  CONSTRAINT valid_currency CHECK (currency IN ('JOD', 'USD')),
  CONSTRAINT valid_provider CHECK (
    provider IN ('hyperpay', 'paytabs', 'tap', 'mock')
  ),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_refund CHECK (refunded_amount >= 0 AND refunded_amount <= amount)
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_customer_id ON payment_transactions(customer_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_escrow_release ON payment_transactions(escrow_release_date)
  WHERE status = 'captured' AND escrow_release_date IS NOT NULL;

-- ============================================
-- 2. Payment Methods Table
-- ============================================
-- Stores tokenized payment methods for customers

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Token info
  token_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,

  -- Card details (tokenized)
  card_brand TEXT,
  card_last4 TEXT,
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  card_holder_name TEXT,
  card_fingerprint TEXT, -- For duplicate detection

  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  billing_address JSONB,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_expiry_month CHECK (
    card_expiry_month IS NULL OR (card_expiry_month >= 1 AND card_expiry_month <= 12)
  ),
  CONSTRAINT valid_expiry_year CHECK (
    card_expiry_year IS NULL OR card_expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE)
  )
);

-- Indexes
CREATE INDEX idx_payment_methods_customer_id ON payment_methods(customer_id);
CREATE INDEX idx_payment_methods_token_id ON payment_methods(token_id);
CREATE INDEX idx_payment_methods_fingerprint ON payment_methods(card_fingerprint);

-- Ensure only one default per customer
CREATE UNIQUE INDEX idx_payment_methods_default ON payment_methods(customer_id)
  WHERE is_default = true AND is_active = true;

-- ============================================
-- 3. Refund Requests Table
-- ============================================
-- Tracks refund requests and their status

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction info
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
  order_id UUID NOT NULL REFERENCES orders(id),

  -- Refund details
  amount INTEGER NOT NULL, -- Amount to refund in fils
  original_amount INTEGER NOT NULL, -- Original transaction amount
  reason TEXT NOT NULL,
  reason_category TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',

  -- Requester info
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_by_role TEXT NOT NULL,

  -- Approval info
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Processing info
  psp_refund_id TEXT,
  processed_at TIMESTAMPTZ,

  -- Failure info
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  evidence JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_refund_status CHECK (
    status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT valid_refund_amount CHECK (amount > 0 AND amount <= original_amount),
  CONSTRAINT valid_reason_category CHECK (
    reason_category IS NULL OR reason_category IN (
      'wrong_items', 'damaged', 'quality_issue', 'not_delivered',
      'duplicate_payment', 'customer_request', 'other'
    )
  )
);

-- Indexes
CREATE INDEX idx_refund_requests_transaction_id ON refund_requests(transaction_id);
CREATE INDEX idx_refund_requests_order_id ON refund_requests(order_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_created_at ON refund_requests(created_at DESC);

-- ============================================
-- 4. Payment Webhooks Table
-- ============================================
-- Logs all webhook events from payment providers

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider info
  provider TEXT NOT NULL,
  event_id TEXT,
  event_type TEXT NOT NULL,

  -- Payload
  payload JSONB NOT NULL,
  headers JSONB,
  signature TEXT,

  -- Processing
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Related entities
  transaction_id UUID REFERENCES payment_transactions(id),
  order_id UUID REFERENCES orders(id),

  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_webhook_status CHECK (
    status IN ('pending', 'processing', 'processed', 'failed', 'ignored')
  )
);

-- Indexes
CREATE INDEX idx_payment_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX idx_payment_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX idx_payment_webhooks_status ON payment_webhooks(status);
CREATE INDEX idx_payment_webhooks_received_at ON payment_webhooks(received_at DESC);

-- Prevent duplicate events
CREATE UNIQUE INDEX idx_payment_webhooks_event ON payment_webhooks(provider, event_id)
  WHERE event_id IS NOT NULL;

-- ============================================
-- 5. Disputes Table (Enhanced)
-- ============================================
-- Comprehensive dispute tracking

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order and transaction
  order_id UUID NOT NULL REFERENCES orders(id),
  transaction_id UUID REFERENCES payment_transactions(id),

  -- Parties
  raised_by UUID NOT NULL REFERENCES profiles(id),
  raised_against UUID REFERENCES suppliers(id),

  -- Dispute details
  reason TEXT NOT NULL,
  reason_category TEXT NOT NULL,
  description TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',

  -- Resolution
  resolution TEXT,
  resolution_type TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Site visit (for high-value disputes)
  requires_site_visit BOOLEAN DEFAULT false,
  site_visit_scheduled_at TIMESTAMPTZ,
  site_visit_completed_at TIMESTAMPTZ,
  site_visit_report JSONB,

  -- Evidence
  evidence JSONB DEFAULT '[]',
  supplier_response TEXT,
  supplier_responded_at TIMESTAMPTZ,

  -- Escalation
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_dispute_status CHECK (
    status IN (
      'pending', 'investigating', 'awaiting_response', 'awaiting_evidence',
      'resolved', 'closed', 'escalated'
    )
  ),
  CONSTRAINT valid_dispute_priority CHECK (
    priority IN ('low', 'normal', 'high', 'critical')
  ),
  CONSTRAINT valid_reason_category CHECK (
    reason_category IN (
      'wrong_items', 'damaged_goods', 'quantity_mismatch',
      'quality_issue', 'non_delivery', 'delayed_delivery',
      'pricing_error', 'payment_issue', 'other'
    )
  ),
  CONSTRAINT valid_resolution_type CHECK (
    resolution_type IS NULL OR resolution_type IN (
      'full_refund', 'partial_refund', 'replacement',
      'credit', 'rejected', 'mutual_agreement'
    )
  )
);

-- Indexes
CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_priority ON disputes(priority);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

-- ============================================
-- 6. Settlement Records Table
-- ============================================
-- Tracks settlements to suppliers

CREATE TABLE IF NOT EXISTS settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Supplier
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  wallet_id UUID NOT NULL REFERENCES wallets(id),

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  total_sales INTEGER NOT NULL,
  total_commission INTEGER NOT NULL,
  total_refunds INTEGER DEFAULT 0,
  total_disputes INTEGER DEFAULT 0,
  net_amount INTEGER NOT NULL,

  -- Transactions
  transaction_count INTEGER NOT NULL,
  transaction_ids UUID[] DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Payment info
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  breakdown JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_settlement_status CHECK (
    status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')
  ),
  CONSTRAINT valid_amounts CHECK (
    total_sales >= 0 AND
    total_commission >= 0 AND
    total_refunds >= 0 AND
    total_disputes >= 0 AND
    net_amount >= 0
  ),
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Indexes
CREATE INDEX idx_settlement_records_supplier_id ON settlement_records(supplier_id);
CREATE INDEX idx_settlement_records_status ON settlement_records(status);
CREATE INDEX idx_settlement_records_period ON settlement_records(period_start, period_end);
CREATE INDEX idx_settlement_records_created_at ON settlement_records(created_at DESC);

-- Prevent duplicate settlements for same period
CREATE UNIQUE INDEX idx_settlement_records_unique_period
  ON settlement_records(supplier_id, period_start, period_end)
  WHERE status != 'cancelled';

-- ============================================
-- 7. Update Orders Table
-- ============================================
-- Add payment-related fields to orders

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES payment_transactions(id),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS commission_amount INTEGER,
ADD COLUMN IF NOT EXISTS net_supplier_amount INTEGER;

-- Add constraint for payment status
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS valid_payment_status;

ALTER TABLE orders
ADD CONSTRAINT valid_payment_status CHECK (
  payment_status IN (
    'pending', 'processing', 'authorized', 'captured',
    'released', 'refunded', 'partially_refunded', 'failed'
  )
);

-- ============================================
-- 8. Update Wallets Table
-- ============================================
-- Add payment tracking fields

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS total_refunded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_disputes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_settlement_date DATE,
ADD COLUMN IF NOT EXISTS next_settlement_date DATE;

-- ============================================
-- 9. RLS Policies
-- ============================================

-- Payment Transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Suppliers can view related transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.id = payment_transactions.order_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Payment Methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Refund Requests
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refund requests"
  ON refund_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders o
      JOIN suppliers s ON s.id = o.supplier_id
      WHERE o.id = refund_requests.order_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create refund requests for own orders"
  ON refund_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id
      AND contractor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all refunds"
  ON refund_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (
    raised_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM suppliers
      WHERE id = raised_against
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id
      AND contractor_id = auth.uid()
    )
  );

CREATE POLICY "Contractors can create disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id
      AND contractor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all disputes"
  ON disputes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Settlement Records
ALTER TABLE settlement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view own settlements"
  ON settlement_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM suppliers
      WHERE id = supplier_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all settlements"
  ON settlement_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Payment Webhooks (internal use only)
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access webhooks"
  ON payment_webhooks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 10. Functions and Triggers
-- ============================================

-- Function to update order payment status
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    UPDATE orders
    SET
      payment_status = NEW.status,
      payment_transaction_id = NEW.id,
      paid_at = CASE
        WHEN NEW.status = 'captured' THEN NEW.captured_at
        ELSE paid_at
      END,
      updated_at = now()
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_payment_status
  AFTER UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_order_payment_status();

-- Function to handle dispute creation
CREATE OR REPLACE FUNCTION handle_dispute_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order status
  UPDATE orders
  SET
    status = 'disputed',
    updated_at = now()
  WHERE id = NEW.order_id;

  -- Freeze payment if exists
  IF NEW.transaction_id IS NOT NULL THEN
    UPDATE payment_transactions
    SET
      status = 'disputed',
      dispute_id = NEW.id,
      disputed_at = now(),
      updated_at = now()
    WHERE id = NEW.transaction_id;
  END IF;

  -- Check if site visit required (order >= 350 JOD)
  UPDATE disputes
  SET requires_site_visit = true
  WHERE id = NEW.id
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE id = NEW.order_id
    AND total_amount >= 350000 -- 350 JOD in fils
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_dispute_creation
  AFTER INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION handle_dispute_creation();

-- Function to calculate settlement
CREATE OR REPLACE FUNCTION calculate_supplier_settlement(
  p_supplier_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  total_sales INTEGER,
  total_commission INTEGER,
  total_refunds INTEGER,
  total_disputes INTEGER,
  net_amount INTEGER,
  transaction_count INTEGER
) AS $$
DECLARE
  v_total_sales INTEGER := 0;
  v_total_commission INTEGER := 0;
  v_total_refunds INTEGER := 0;
  v_total_disputes INTEGER := 0;
  v_transaction_count INTEGER := 0;
BEGIN
  -- Calculate total sales and commission
  SELECT
    COALESCE(SUM(pt.amount), 0),
    COALESCE(SUM(pt.platform_amount), 0),
    COUNT(*)
  INTO v_total_sales, v_total_commission, v_transaction_count
  FROM payment_transactions pt
  JOIN orders o ON o.id = pt.order_id
  WHERE o.supplier_id = p_supplier_id
  AND pt.status = 'released'
  AND pt.released_at >= p_period_start
  AND pt.released_at < p_period_end + INTERVAL '1 day';

  -- Calculate refunds
  SELECT COALESCE(SUM(rr.amount), 0)
  INTO v_total_refunds
  FROM refund_requests rr
  JOIN orders o ON o.id = rr.order_id
  WHERE o.supplier_id = p_supplier_id
  AND rr.status = 'completed'
  AND rr.completed_at >= p_period_start
  AND rr.completed_at < p_period_end + INTERVAL '1 day';

  -- Calculate disputes (unresolved)
  SELECT COALESCE(SUM(o.total_amount), 0)
  INTO v_total_disputes
  FROM disputes d
  JOIN orders o ON o.id = d.order_id
  WHERE o.supplier_id = p_supplier_id
  AND d.status NOT IN ('resolved', 'closed')
  AND d.created_at >= p_period_start
  AND d.created_at < p_period_end + INTERVAL '1 day';

  RETURN QUERY SELECT
    v_total_sales,
    v_total_commission,
    v_total_refunds,
    v_total_disputes,
    v_total_sales - v_total_commission - v_total_refunds - v_total_disputes,
    v_transaction_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. Initial Configuration
-- ============================================

-- Insert default payment provider config (for reference)
INSERT INTO system_settings (key, value, category, description)
VALUES
  ('payment.provider', '"mock"', 'payment', 'Active payment provider'),
  ('payment.environment', '"sandbox"', 'payment', 'Payment environment'),
  ('payment.commission_rate', '10', 'payment', 'Platform commission percentage'),
  ('payment.escrow_days', '3', 'payment', 'Days to hold payment in escrow'),
  ('payment.auto_release', 'true', 'payment', 'Auto-release payments after escrow period'),
  ('payment.dispute_threshold_jod', '350', 'payment', 'Amount requiring site visit for disputes')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================
-- Rollback Script (Save separately)
-- ============================================
/*
BEGIN;

DROP TRIGGER IF EXISTS trigger_update_order_payment_status ON payment_transactions;
DROP TRIGGER IF EXISTS trigger_handle_dispute_creation ON disputes;

DROP FUNCTION IF EXISTS update_order_payment_status();
DROP FUNCTION IF EXISTS handle_dispute_creation();
DROP FUNCTION IF EXISTS calculate_supplier_settlement(UUID, DATE, DATE);

DROP TABLE IF EXISTS settlement_records CASCADE;
DROP TABLE IF EXISTS payment_webhooks CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS refund_requests CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;

ALTER TABLE orders
DROP COLUMN IF EXISTS payment_transaction_id,
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS paid_at,
DROP COLUMN IF EXISTS commission_rate,
DROP COLUMN IF EXISTS commission_amount,
DROP COLUMN IF EXISTS net_supplier_amount;

ALTER TABLE wallets
DROP COLUMN IF EXISTS total_refunded,
DROP COLUMN IF EXISTS total_disputes,
DROP COLUMN IF EXISTS last_settlement_date,
DROP COLUMN IF EXISTS next_settlement_date;

DELETE FROM system_settings WHERE category = 'payment';

COMMIT;
*/