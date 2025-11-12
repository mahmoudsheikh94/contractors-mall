/**
 * POST /api/invoices/generate
 * ===========================
 *
 * Generates Jordan-compliant e-invoices from delivered orders
 * Supplier only - generates invoices for their own delivered orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJordanInvoice, type InvoiceType, type InvoiceCategory, type BuyerIdType } from '@/lib/invoicing/generator'
import { trackAPIError } from '@/lib/monitoring'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

interface GenerateInvoiceRequest {
  orderId: string
  invoiceType: InvoiceType
  invoiceCategory?: InvoiceCategory
  notes?: string
  // Optional buyer details
  buyerName?: string
  buyerIdType?: BuyerIdType
  buyerIdNumber?: string
  buyerPhone?: string
  buyerCity?: string
  buyerPostalCode?: string
}

export async function POST(request: NextRequest) {
  try {
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

    // 3. Parse request body
    const body: GenerateInvoiceRequest = await request.json()

    if (!body.orderId || !body.invoiceType) {
      return NextResponse.json(
        { error: 'معرف الطلب ونوع الفاتورة مطلوبان (Order ID and invoice type required)' },
        { status: 400 }
      )
    }

    // 4. Validate invoice type
    const validInvoiceTypes: InvoiceType[] = ['income', 'sales_tax', 'special_tax']
    if (!validInvoiceTypes.includes(body.invoiceType)) {
      return NextResponse.json(
        { error: 'نوع فاتورة غير صالح (Invalid invoice type)' },
        { status: 400 }
      )
    }

    // 5. Generate invoice
    const invoice = await generateJordanInvoice(
      {
        orderId: body.orderId,
        invoiceType: body.invoiceType,
        invoiceCategory: body.invoiceCategory,
        notes: body.notes,
        buyerName: body.buyerName,
        buyerIdType: body.buyerIdType,
        buyerIdNumber: body.buyerIdNumber,
        buyerPhone: body.buyerPhone,
        buyerCity: body.buyerCity,
        buyerPostalCode: body.buyerPostalCode
      },
      user.id
    )

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: `تم إنشاء الفاتورة ${invoice.invoiceNumber} بنجاح (Invoice generated successfully)`,
      invoice
    }, { status: 201 })

  } catch (error: any) {
    console.error('Invoice generation error:', error)

    // Track error in monitoring
    trackAPIError(
      error,
      '/api/invoices/generate',
      'POST',
      500
    )

    // Return user-friendly error message
    const errorMessage = error.message || 'فشل في إنشاء الفاتورة (Failed to generate invoice)'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
