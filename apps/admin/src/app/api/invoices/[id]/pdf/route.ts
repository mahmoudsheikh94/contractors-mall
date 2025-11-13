/**
 * POST /api/invoices/[id]/pdf
 * ============================
 *
 * Generates PDF for a Jordan e-invoice and uploads to Supabase Storage
 * Returns PDF URL for download
 *
 * Authentication: Requires supplier_admin role
 * Access Control: Supplier can only generate PDFs for their own invoices
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/invoicing/InvoicePDFTemplate'
import { trackAPIError } from '@/lib/monitoring'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: invoiceId } = await params
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح (Unauthorized)' },
        { status: 401 }
      )
    }

    // 2. Verify supplier role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'supplier_admin') {
      return NextResponse.json(
        { error: 'وصول محظور - مطلوب حساب مورد (Forbidden - Supplier access required)' },
        { status: 403 }
      )
    }

    // 3. Get supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'حساب مورد غير موجود (Supplier account not found)' },
        { status: 403 }
      )
    }

    // 4. Fetch invoice with line items
    // @ts-ignore - invoices table not in types
    const { data: invoice, error: invoiceError } = await supabase
      // @ts-ignore
      .from('invoices')
      .select(`
        *,
        invoice_line_items (*),
        order:orders (order_number)
      `)
      .eq('id', invoiceId)
      .eq('supplier_id', supplier.id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError)
      return NextResponse.json(
        { error: 'الفاتورة غير موجودة (Invoice not found)' },
        { status: 404 }
      )
    }

    console.log('📄 Generating PDF for invoice:', invoiceId)

    // 5. Prepare data for PDF template
    const lineItems = Array.isArray(invoice.invoice_line_items)
      ? invoice.invoice_line_items
      : []
    const order = Array.isArray(invoice.order) ? invoice.order[0] : invoice.order

    const pdfData = {
      invoice: {
        invoice_number: invoice.invoice_number,
        invoice_type: invoice.invoice_type,
        invoice_category: invoice.invoice_category,
        issue_date: invoice.issue_date,
        status: invoice.status,
        seller_name: invoice.seller_name,
        seller_name_en: invoice.seller_name_en,
        seller_tax_number: invoice.seller_tax_number,
        seller_phone: invoice.seller_phone,
        seller_address: invoice.seller_address,
        seller_city: invoice.seller_city,
        buyer_name: invoice.buyer_name,
        buyer_id_type: invoice.buyer_id_type,
        buyer_id_number: invoice.buyer_id_number,
        buyer_phone: invoice.buyer_phone,
        buyer_city: invoice.buyer_city,
        buyer_postal_code: invoice.buyer_postal_code,
        subtotal_jod: invoice.subtotal_jod,
        discount_total_jod: invoice.discount_total_jod,
        general_tax_total_jod: invoice.general_tax_total_jod,
        special_tax_total_jod: invoice.special_tax_total_jod,
        grand_total_jod: invoice.grand_total_jod,
        currency: invoice.currency,
        notes: invoice.notes
      },
      lineItems: lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price_jod: item.unit_price_jod,
        discount_jod: item.discount_jod || 0,
        general_tax_rate: item.general_tax_rate || 0,
        general_tax_amount_jod: item.general_tax_amount_jod || 0,
        line_total_jod: item.line_total_jod
      })),
      orderNumber: order?.order_number
    }

    // 6. Generate PDF
    const pdfDocument = InvoicePDF(pdfData)
    const pdfBuffer = await renderToBuffer(pdfDocument)

    // 7. Upload to Supabase Storage
    const fileName = `${supplier.id}/${invoiceId}.pdf`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true  // Replace if exists
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return NextResponse.json(
        { error: 'فشل في رفع ملف PDF (Failed to upload PDF)' },
        { status: 500 }
      )
    }

    // 8. Get public URL
    const { data: urlData } = supabase
      .storage
      .from('invoices')
      .getPublicUrl(fileName)

    const pdfUrl = urlData.publicUrl

    // 9. Update invoice with PDF URL
    // @ts-ignore
    const { error: updateError } = await supabase
      // @ts-ignore
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice with PDF URL:', updateError)
      return NextResponse.json(
        { error: 'فشل في تحديث الفاتورة (Failed to update invoice)' },
        { status: 500 }
      )
    }

    console.log('✅ PDF generated successfully:', pdfUrl)

    // 10. Return success response
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء ملف PDF بنجاح (PDF generated successfully)',
      pdfUrl
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)

    // Track error in monitoring
    trackAPIError(
      error,
      '/api/invoices/[id]/pdf',
      'POST',
      500
    )

    return NextResponse.json(
      {
        error: error.message || 'فشل في إنشاء ملف PDF (Failed to generate PDF)'
      },
      { status: 500 }
    )
  }
}
