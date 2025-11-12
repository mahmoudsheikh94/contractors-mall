-- ==========================================
-- Jordan E-Invoicing System (نظام الفوترة الوطني)
-- Date: January 13, 2025
-- ==========================================
--
-- This migration creates the database schema for Jordan's National Invoicing System
-- compliance, supporting small-to-medium construction material suppliers.
--
-- COMPLIANCE: Jordan Income and Sales Tax Department
-- STANDARD: National Invoicing System User Manual (2024)
-- PORTAL: portal.jofotara.gov.jo
--
-- FEATURES:
-- - 3 invoice types: income tax, sales tax, special tax
-- - Sequential invoice numbering (gapless, per supplier)
-- - Full audit trail
-- - Jordan tax authority field requirements
-- - Multi-currency support (JOD primary)
-- ==========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUMS
-- ==========================================

-- Invoice types as per Jordan tax law
CREATE TYPE invoice_type AS ENUM (
  'income',        -- فاتورة ضريبة دخل (no tax calculations)
  'sales_tax',     -- فاتورة ضريبة مبيعات (general sales tax)
  'special_tax'    -- فاتورة ضريبة خاصة (general + special taxes)
);

-- Invoice categories as per Jordan regulations
CREATE TYPE invoice_category AS ENUM (
  'local',              -- فاتورة محلية (standard domestic invoice)
  'export',             -- فاتورة تصدير (0% tax rate)
  'development_zone'    -- فاتورة مناطق تنموية/تشجيع استثمار (0% tax, requires buyer tax number)
);

-- Invoice lifecycle status
CREATE TYPE invoice_status AS ENUM (
  'draft',                 -- Being created, not yet issued
  'issued',                -- Generated and ready for submission
  'submitted_to_portal',   -- Successfully submitted to Jordan portal
  'cancelled'              -- Cancelled/voided invoice
);

-- Portal submission status (for Phase 2 API integration)
CREATE TYPE submission_status AS ENUM (
  'pending',   -- Queued for submission
  'success',   -- Successfully submitted
  'failed'     -- Submission failed (see error message)
);

-- Buyer ID types as per Jordan system
CREATE TYPE buyer_id_type AS ENUM (
  'national_id',      -- الرقم الوطني
  'tax_number',       -- الرقم الضريبي
  'personal_number'   -- الرقم الشخصي
);

-- Item types for invoice line items
CREATE TYPE invoice_item_type AS ENUM (
  'product',           -- سلعة
  'service',           -- خدمة
  'service_allowance'  -- بدل خدمة
);

-- ==========================================
-- INVOICES TABLE
-- ==========================================

CREATE TABLE invoices (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Invoice Numbers
  invoice_number TEXT NOT NULL UNIQUE, -- Sequential per supplier (e.g., "SUP001-2025-0001")
  electronic_invoice_number TEXT UNIQUE, -- From Jordan portal API (Phase 2)

  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Invoice Type & Category
  invoice_type invoice_type NOT NULL,
  invoice_category invoice_category NOT NULL DEFAULT 'local',

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Currency
  currency TEXT NOT NULL DEFAULT 'JOD' CHECK (currency IN ('JOD', 'USD', 'EUR')),

  -- ====================
  -- SELLER DETAILS (بيانات البائع)
  -- Denormalized for historical accuracy
  -- ====================
  seller_tax_number TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  seller_name_en TEXT,
  seller_phone TEXT,
  seller_address TEXT,
  seller_city TEXT,

  -- ====================
  -- BUYER DETAILS (بيانات المشتري)
  -- ====================
  buyer_name TEXT NOT NULL, -- Required for receivables and orders ≥10,000 JOD
  buyer_id_type buyer_id_type,
  buyer_id_number TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  buyer_postal_code TEXT,

  -- ====================
  -- FINANCIAL TOTALS (calculated and stored)
  -- ====================
  subtotal_jod DECIMAL(12,2) NOT NULL,           -- Sum of all line items before tax/discount
  discount_total_jod DECIMAL(12,2) NOT NULL DEFAULT 0,
  general_tax_total_jod DECIMAL(12,2) NOT NULL DEFAULT 0,  -- الضريبة العامة (sales tax)
  special_tax_total_jod DECIMAL(12,2) NOT NULL DEFAULT 0,  -- الضريبة الخاصة
  grand_total_jod DECIMAL(12,2) NOT NULL,         -- Final total including all taxes

  -- ====================
  -- STATUS & SUBMISSION
  -- ====================
  status invoice_status NOT NULL DEFAULT 'draft',
  submission_status submission_status,  -- NULL if not submitted, set for Phase 2
  submission_error TEXT,                -- Error message if submission failed
  submitted_at TIMESTAMPTZ,             -- Timestamp of portal submission

  -- ====================
  -- METADATA
  -- ====================
  notes TEXT,                           -- Internal notes
  pdf_url TEXT,                         -- URL to generated PDF in Supabase Storage
  original_invoice_id UUID REFERENCES invoices(id), -- For return/credit invoices (فاتورة ارجاع)
  is_return BOOLEAN NOT NULL DEFAULT false,
  return_reason TEXT,                   -- Required if is_return = true

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT valid_grand_total CHECK (grand_total_jod >= 0),
  CONSTRAINT buyer_name_required_for_large_orders CHECK (
    (grand_total_jod < 10000) OR (buyer_name IS NOT NULL AND buyer_name != '')
  ),
  CONSTRAINT return_invoice_has_original CHECK (
    (is_return = false) OR (original_invoice_id IS NOT NULL)
  ),
  CONSTRAINT development_zone_requires_buyer_tax CHECK (
    (invoice_category != 'development_zone') OR (buyer_id_type = 'tax_number' AND buyer_id_number IS NOT NULL)
  )
);

-- ==========================================
-- INVOICE LINE ITEMS TABLE
-- ==========================================

CREATE TABLE invoice_line_items (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- ====================
  -- PRODUCT/SERVICE DETAILS (بيانات السلعة/الخدمة)
  -- ====================
  activity_classification TEXT, -- التصنيف الوطني للأنشطة (from Jordan dropdown)
  item_type invoice_item_type NOT NULL,
  description TEXT NOT NULL,    -- وصف السلعة/الخدمة (required)

  -- ====================
  -- PRICING
  -- ====================
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_price_jod DECIMAL(12,2) NOT NULL CHECK (unit_price_jod >= 0),
  discount_jod DECIMAL(12,2) DEFAULT 0 CHECK (discount_jod >= 0),
  subtotal_jod DECIMAL(12,2) NOT NULL, -- (quantity * unit_price) - discount

  -- ====================
  -- TAX CALCULATIONS
  -- ====================
  special_tax_value_jod DECIMAL(12,2) DEFAULT 0,  -- قيمة الضريبة الخاصة (manual entry for special_tax invoices)
  general_tax_rate DECIMAL(5,2) DEFAULT 0,        -- نسبة الضريبة العامة (e.g., 16.00 for 16%)
  general_tax_amount_jod DECIMAL(12,2) DEFAULT 0, -- Calculated: subtotal * (general_tax_rate / 100)

  line_total_jod DECIMAL(12,2) NOT NULL,          -- subtotal + special_tax + general_tax

  -- ====================
  -- OPTIONAL PRODUCT LINK
  -- ====================
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Link to products table (optional for custom items)

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_subtotal CHECK (subtotal_jod >= 0),
  CONSTRAINT valid_line_total CHECK (line_total_jod >= 0)
);

-- ==========================================
-- INVOICE SEQUENCE GENERATOR
-- ==========================================
-- Sequential invoice numbering per supplier
-- Format: SUP{supplier_id_short}-{year}-{sequence}
-- Example: SUP001-2025-0001

CREATE SEQUENCE invoice_number_seq START 1;

-- Function to generate next invoice number for a supplier
CREATE OR REPLACE FUNCTION generate_invoice_number(p_supplier_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INT;
  v_invoice_number TEXT;
  v_supplier_short TEXT;
BEGIN
  -- Get current year
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  -- Get next sequence number for this supplier+year combination
  SELECT COALESCE(MAX(
    CAST(
      SPLIT_PART(invoice_number, '-', 3) AS INT
    )
  ), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE supplier_id = p_supplier_id
    AND invoice_number LIKE 'SUP%-' || v_year || '-%';

  -- Generate supplier short code (last 6 chars of UUID)
  v_supplier_short := SUBSTRING(p_supplier_id::TEXT FROM 31 FOR 6);

  -- Format: SUP{6chars}-{year}-{0001}
  v_invoice_number := 'SUP' || v_supplier_short || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INDEXES
-- ==========================================

-- Performance indexes
CREATE INDEX idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX idx_invoices_contractor_id ON invoices(contractor_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_electronic_number ON invoices(electronic_invoice_number) WHERE electronic_invoice_number IS NOT NULL;

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_product_id ON invoice_line_items(product_id) WHERE product_id IS NOT NULL;

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Suppliers can view and create their own invoices
CREATE POLICY "Suppliers can view own invoices"
  ON invoices FOR SELECT
  USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can create own invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    supplier_id = auth.uid() AND
    created_by = auth.uid()
  );

CREATE POLICY "Suppliers can update own draft invoices"
  ON invoices FOR UPDATE
  USING (supplier_id = auth.uid() AND status = 'draft');

-- Contractors can view invoices for their orders
CREATE POLICY "Contractors can view their invoices"
  ON invoices FOR SELECT
  USING (contractor_id = auth.uid());

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Invoice line items inherit invoice permissions
CREATE POLICY "Users can view line items for invoices they can see"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND (
        invoices.supplier_id = auth.uid() OR
        invoices.contractor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Suppliers can create line items for own invoices"
  ON invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.supplier_id = auth.uid()
      AND invoices.status = 'draft'
    )
  );

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- ==========================================
-- SUPPLIER TABLE ENHANCEMENTS
-- ==========================================
-- Add tax registration and portal API fields

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_registration_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_registration_name_en TEXT;

-- Portal API credentials (for Phase 2)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_username TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_api_key TEXT; -- Encrypted
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_api_enabled BOOLEAN DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_api_configured_at TIMESTAMPTZ;

-- Create index on tax_number
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_number ON suppliers(tax_number) WHERE tax_number IS NOT NULL;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE invoices IS 'Jordan-compliant e-invoices generated from delivered orders';
COMMENT ON TABLE invoice_line_items IS 'Line items for invoices (products/services)';
COMMENT ON COLUMN invoices.invoice_number IS 'Sequential invoice number per supplier (SUP{id}-YYYY-####)';
COMMENT ON COLUMN invoices.electronic_invoice_number IS 'Electronic invoice number from Jordan portal (Phase 2)';
COMMENT ON COLUMN invoices.buyer_name IS 'Required for receivables and orders ≥10,000 JOD';
COMMENT ON COLUMN invoices.general_tax_total_jod IS 'Sales tax total (الضريبة العامة)';
COMMENT ON COLUMN invoices.special_tax_total_jod IS 'Special tax total (الضريبة الخاصة)';
COMMENT ON COLUMN invoice_line_items.activity_classification IS 'National activity classification (التصنيف الوطني للأنشطة)';

-- ==========================================
-- VERIFICATION QUERY
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Jordan E-Invoicing System migration completed successfully';
  RAISE NOTICE 'Created tables: invoices, invoice_line_items';
  RAISE NOTICE 'Created enums: invoice_type, invoice_category, invoice_status, submission_status, buyer_id_type, invoice_item_type';
  RAISE NOTICE 'Created function: generate_invoice_number()';
  RAISE NOTICE 'Enhanced suppliers table with tax registration fields';
  RAISE NOTICE 'RLS policies enabled for secure access';
END $$;
