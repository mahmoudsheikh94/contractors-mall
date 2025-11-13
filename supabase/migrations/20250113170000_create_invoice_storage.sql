-- Create Invoice PDF Storage
-- ============================
--
-- Creates storage bucket for invoice PDFs with RLS policies
-- Ensures suppliers can upload PDFs and users can download based on access rights

-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Suppliers can upload PDFs for their own invoices
CREATE POLICY "Suppliers can upload invoice PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM suppliers WHERE owner_id = auth.uid()
  )
);

-- RLS Policy: Suppliers can update/replace their own invoice PDFs
CREATE POLICY "Suppliers can update invoice PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM suppliers WHERE owner_id = auth.uid()
  )
);

-- RLS Policy: Users can view PDFs for invoices they have access to
CREATE POLICY "Users can view invoice PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    -- Supplier owns this invoice (folder name is supplier_id)
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM suppliers WHERE owner_id = auth.uid()
    )
    OR
    -- Contractor's invoice (invoice filename is invoice_id)
    (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM invoices WHERE contractor_id = auth.uid()
    )
    OR
    -- Admin can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- RLS Policy: Admins and suppliers can delete their invoice PDFs
CREATE POLICY "Delete invoice PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    -- Supplier owns this invoice
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM suppliers WHERE owner_id = auth.uid()
    )
    OR
    -- Admin can delete any
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- Add helpful comment
COMMENT ON TABLE storage.buckets IS 'Invoice PDFs stored in invoices/ bucket with structure: {supplier_id}/{invoice_id}.pdf';
