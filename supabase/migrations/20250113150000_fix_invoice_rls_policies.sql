-- Fix Invoice RLS Policies
-- ===========================
--
-- Issue: RLS policies were checking supplier_id = auth.uid()
-- But supplier_id is from suppliers table, auth.uid() is the owner_id
--
-- Fix: Check that the user owns the supplier via suppliers.owner_id

-- Drop old policies
DROP POLICY IF EXISTS "Suppliers can create own invoices" ON invoices;
DROP POLICY IF EXISTS "Suppliers can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Suppliers can update own draft invoices" ON invoices;

-- Create corrected policies that check supplier ownership

-- Allow suppliers to create invoices for their own supplier account
CREATE POLICY "Suppliers can create own invoices"
ON invoices
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM suppliers
    WHERE suppliers.id = invoices.supplier_id
    AND suppliers.owner_id = auth.uid()
  )
);

-- Allow suppliers to view invoices for their own supplier account
CREATE POLICY "Suppliers can view own invoices"
ON invoices
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM suppliers
    WHERE suppliers.id = invoices.supplier_id
    AND suppliers.owner_id = auth.uid()
  )
);

-- Allow suppliers to update their own draft invoices
CREATE POLICY "Suppliers can update own draft invoices"
ON invoices
FOR UPDATE
TO public
USING (
  status = 'draft'::invoice_status
  AND EXISTS (
    SELECT 1 FROM suppliers
    WHERE suppliers.id = invoices.supplier_id
    AND suppliers.owner_id = auth.uid()
  )
);
