-- Fix Storage RLS Policy for Contractor Invoice PDF Access
-- ===========================================================
--
-- The original policy checked (storage.foldername(name))[2] for contractor access,
-- but the path structure is {supplier_id}/{invoice_id}.pdf
-- This fix properly extracts the invoice_id from the filename for contractor access

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view invoice PDFs" ON storage.objects;

-- Recreate with corrected contractor access check
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
    -- Contractor's invoice (extract invoice_id from filename without .pdf extension)
    REPLACE((storage.filename(name)), '.pdf', '')::uuid IN (
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

-- Add helpful comment
COMMENT ON POLICY "Users can view invoice PDFs" ON storage.objects IS
  'Allows contractors to view invoice PDFs for their orders, suppliers to view their own invoices, and admins to view all invoices. Path structure: {supplier_id}/{invoice_id}.pdf';
