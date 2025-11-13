-- Fix Invoice Line Items RLS Policy
-- ===================================
--
-- Issue: RLS policy was checking invoices.supplier_id = auth.uid()
-- But supplier_id is from suppliers table, auth.uid() is the owner_id
--
-- Fix: Check that the user owns the supplier via suppliers.owner_id

-- Drop old policy
DROP POLICY IF EXISTS "Suppliers can create line items for own invoices" ON invoice_line_items;

-- Create corrected policy that checks supplier ownership
CREATE POLICY "Suppliers can create line items for own invoices"
ON invoice_line_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM invoices i
    JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.id = invoice_line_items.invoice_id
    AND s.owner_id = auth.uid()
    AND i.status = 'draft'::invoice_status
  )
);

-- Also fix the SELECT policy to be consistent
DROP POLICY IF EXISTS "Users can view line items for invoices they can see" ON invoice_line_items;

CREATE POLICY "Users can view line items for invoices they can see"
ON invoice_line_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM invoices i
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.id = invoice_line_items.invoice_id
    AND (
      -- Admin can see all
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
      -- Supplier can see their own
      OR s.owner_id = auth.uid()
      -- Contractor can see their invoices
      OR i.contractor_id = auth.uid()
    )
  )
);