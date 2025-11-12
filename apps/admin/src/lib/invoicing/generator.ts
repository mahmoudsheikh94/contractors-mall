/**
 * Jordan E-Invoicing Generator
 * ============================
 *
 * Generates Jordan-compliant invoices from delivered orders
 * Complies with: National Invoicing System User Manual (2024)
 * Portal: portal.jofotara.gov.jo
 *
 * Features:
 * - 3 invoice types: income, sales_tax, special_tax
 * - Auto tax calculations
 * - Sequential numbering
 * - Jordan field requirements validation
 */

import { createClient } from '@/lib/supabase/server'
import {
  InvoiceType,
  InvoiceCategory,
  BuyerIdType,
  InvoiceItemType,
  InvoiceStatus,
  SubmissionStatus
} from '@contractors-mall/shared'

// ==========================================
// TYPES
// ==========================================

// Re-export for backward compatibility
export { InvoiceType, InvoiceCategory, BuyerIdType, InvoiceItemType, InvoiceStatus, SubmissionStatus }

export interface GenerateInvoiceParams {
  orderId: string
  invoiceType: InvoiceType
  invoiceCategory?: InvoiceCategory
  notes?: string
  // Optional buyer details (if not in contractor profile)
  buyerName?: string
  buyerIdType?: BuyerIdType
  buyerIdNumber?: string
  buyerPhone?: string
  buyerCity?: string
  buyerPostalCode?: string
}

export interface InvoiceLineItemData {
  activityClassification?: string
  itemType: InvoiceItemType
  description: string
  quantity: number
  unitPriceJod: number
  discountJod?: number
  specialTaxValueJod?: number  // For special_tax invoices only
  generalTaxRate?: number       // For sales_tax and special_tax invoices
  productId?: string
}

export interface GeneratedInvoice {
  id: string
  invoiceNumber: string
  orderNumber: string
  invoiceType: InvoiceType
  issueDate: string
  subtotalJod: number
  discountTotalJod: number
  generalTaxTotalJod: number
  specialTaxTotalJod: number
  grandTotalJod: number
  pdfUrl?: string
}

// ==========================================
// TAX RATES (configurable per Jordan regulations)
// ==========================================

export const JORDAN_TAX_RATES = {
  STANDARD_SALES_TAX: 16.0,  // 16% general sales tax
  EXPORT_TAX: 0.0,           // 0% for exports
  DEVELOPMENT_ZONE_TAX: 0.0, // 0% for development zones
} as const

// Activity classifications (sample - full list from Jordan portal)
export const ACTIVITY_CLASSIFICATIONS = [
  { code: '01', label: 'مواد بناء وإنشاءات' },
  { code: '02', label: 'خدمات تجارية' },
  { code: '03', label: 'صناعات' },
  // ... (full list would come from Jordan portal API or config)
] as const

// ==========================================
// MAIN INVOICE GENERATION FUNCTION
// ==========================================

export async function generateJordanInvoice(
  params: GenerateInvoiceParams,
  supplierId: string
): Promise<GeneratedInvoice> {
  const supabase = await createClient()

  // Step 1: Fetch order with all related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        quantity,
        unit_price_jod,
        total_jod,
        product:products (
          id,
          name_ar,
          name_en,
          sku,
          category_id
        )
      ),
      supplier:suppliers (
        id,
        business_name,
        business_name_en,
        phone,
        address,
        city,
        tax_number
      ),
      contractor:profiles (
        id,
        full_name,
        phone,
        email,
        city
      )
    `)
    .eq('id', params.orderId)
    .eq('supplier_id', supplierId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found or access denied')
  }

  // Step 2: Validate order is delivered
  if (order.status !== 'delivered' && order.status !== 'completed') {
    throw new Error('يمكن فقط إصدار فواتير للطلبات المكتملة (Only delivered/completed orders can be invoiced)')
  }

  // Step 3: Check if invoice already exists for this order
  // @ts-ignore - invoices table not in types until migration applied
  const { data: existingInvoice } = await supabase
    // @ts-ignore
    .from('invoices')
    .select('id, invoice_number')
    .eq('order_id', params.orderId)
    .eq('is_return', false)
    .single()

  if (existingInvoice) {
    throw new Error(`فاتورة موجودة بالفعل: ${(existingInvoice as any).invoice_number} (Invoice already exists)`)
  }

  // Step 4: Validate supplier has tax registration
  const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier
  if (!supplier?.tax_number) {
    throw new Error('يجب تسجيل الرقم الضريبي للمورد أولاً (Supplier tax number required)')
  }

  // Step 5: Prepare buyer details
  const contractor = Array.isArray(order.contractor) ? order.contractor[0] : order.contractor
  const buyerName = params.buyerName || contractor?.full_name || ''

  // Validate buyer name requirement (Jordan rule: required for ≥10,000 JOD)
  if (order.total_jod >= 10000 && !buyerName) {
    throw new Error('اسم المشتري مطلوب للفواتير بقيمة 10,000 د.أ وأكثر (Buyer name required for invoices ≥10,000 JOD)')
  }

  // Step 6: Validate development zone requirements
  if (params.invoiceCategory === 'development_zone') {
    if (!params.buyerIdType || params.buyerIdType !== 'tax_number' || !params.buyerIdNumber) {
      throw new Error('فواتير المناطق التنموية تتطلب الرقم الضريبي للمشتري (Development zone invoices require buyer tax number)')
    }
  }

  // Step 7: Generate sequential invoice number
  // @ts-ignore - RPC function not in types until migration applied
  const { data: invoiceNumberResult, error: invoiceNumberError } = await supabase
    // @ts-ignore
    .rpc('generate_invoice_number', { p_supplier_id: supplierId })

  if (invoiceNumberError || !invoiceNumberResult) {
    throw new Error('Failed to generate invoice number')
  }

  const invoiceNumber = invoiceNumberResult as string

  // Step 8: Prepare line items with tax calculations
  const orderItems: any = Array.isArray(order.order_items) ? order.order_items : []
  const lineItems: InvoiceLineItemData[] = orderItems.map((item: any) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product

    // Determine tax rate based on invoice type and category
    let generalTaxRate = 0
    if (params.invoiceType !== 'income') {
      if (params.invoiceCategory === 'export' || params.invoiceCategory === 'development_zone') {
        generalTaxRate = JORDAN_TAX_RATES.EXPORT_TAX
      } else {
        generalTaxRate = JORDAN_TAX_RATES.STANDARD_SALES_TAX
      }
    }

    return {
      itemType: 'product' as InvoiceItemType,
      description: product?.name_ar || 'منتج',
      quantity: item.quantity,
      unitPriceJod: parseFloat(item.unit_price_jod.toString()),
      discountJod: 0, // TODO: Add discount support in Phase 2
      specialTaxValueJod: 0, // TODO: Add special tax input in UI
      generalTaxRate,
      productId: item.product_id
    }
  })

  // Step 9: Calculate totals
  const calculations = calculateInvoiceTotals(lineItems, params.invoiceType)

  // Step 10: Create invoice record
  // @ts-ignore - invoices table not in types until migration applied
  const { data: invoice, error: invoiceError } = await supabase
    // @ts-ignore
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      order_id: params.orderId,
      supplier_id: supplierId,
      contractor_id: order.contractor_id,
      invoice_type: params.invoiceType,
      invoice_category: params.invoiceCategory || 'local',
      issue_date: new Date().toISOString().split('T')[0],
      currency: 'JOD',

      // Seller details (denormalized for historical accuracy)
      seller_tax_number: supplier.tax_number,
      seller_name: supplier.business_name,
      seller_name_en: supplier.business_name_en,
      seller_phone: supplier.phone,
      seller_address: supplier.address,
      seller_city: supplier.city,

      // Buyer details
      buyer_name: buyerName,
      buyer_id_type: params.buyerIdType,
      buyer_id_number: params.buyerIdNumber,
      buyer_phone: params.buyerPhone || contractor?.phone,
      buyer_city: params.buyerCity || contractor?.city || order.delivery_address,
      buyer_postal_code: params.buyerPostalCode,

      // Financial totals
      subtotal_jod: calculations.subtotal,
      discount_total_jod: calculations.discountTotal,
      general_tax_total_jod: calculations.generalTaxTotal,
      special_tax_total_jod: calculations.specialTaxTotal,
      grand_total_jod: calculations.grandTotal,

      // Status
      status: 'draft', // Will change to 'issued' after PDF generation

      // Metadata
      notes: params.notes,
      created_by: supplierId
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    throw new Error(`فشل في إنشاء الفاتورة: ${invoiceError?.message || 'Unknown error'}`)
  }

  // Step 11: Create line items
  const lineItemsToInsert = lineItems.map(item => {
    const subtotal = item.quantity * item.unitPriceJod - (item.discountJod || 0)
    const generalTaxAmount = subtotal * ((item.generalTaxRate || 0) / 100)
    const lineTotal = subtotal + (item.specialTaxValueJod || 0) + generalTaxAmount

    return {
      invoice_id: (invoice as any).id,
      activity_classification: item.activityClassification,
      item_type: item.itemType,
      description: item.description,
      quantity: item.quantity,
      unit_price_jod: item.unitPriceJod,
      discount_jod: item.discountJod || 0,
      subtotal_jod: subtotal,
      special_tax_value_jod: item.specialTaxValueJod || 0,
      general_tax_rate: item.generalTaxRate || 0,
      general_tax_amount_jod: generalTaxAmount,
      line_total_jod: lineTotal,
      product_id: item.productId
    }
  })

  // @ts-ignore - invoice_line_items table not in types until migration applied
  const { error: lineItemsError } = await supabase
    // @ts-ignore
    .from('invoice_line_items')
    // @ts-ignore
    .insert(lineItemsToInsert as any)

  if (lineItemsError) {
    // Rollback: delete invoice
    // @ts-ignore
    await supabase.from('invoices').delete().eq('id', (invoice as any).id)
    throw new Error(`فشل في إضافة عناصر الفاتورة: ${lineItemsError.message}`)
  }

  // Step 12: Return generated invoice
  const inv = invoice as any
  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    orderNumber: (order as any).order_number,
    invoiceType: inv.invoice_type,
    issueDate: inv.issue_date,
    subtotalJod: parseFloat(inv.subtotal_jod.toString()),
    discountTotalJod: parseFloat(inv.discount_total_jod.toString()),
    generalTaxTotalJod: parseFloat(inv.general_tax_total_jod.toString()),
    specialTaxTotalJod: parseFloat(inv.special_tax_total_jod.toString()),
    grandTotalJod: parseFloat(inv.grand_total_jod.toString()),
    pdfUrl: inv.pdf_url
  }
}

// ==========================================
// TAX CALCULATION HELPERS
// ==========================================

interface InvoiceTotals {
  subtotal: number
  discountTotal: number
  generalTaxTotal: number
  specialTaxTotal: number
  grandTotal: number
}

function calculateInvoiceTotals(
  lineItems: InvoiceLineItemData[],
  invoiceType: InvoiceType
): InvoiceTotals {
  let subtotal = 0
  let discountTotal = 0
  let generalTaxTotal = 0
  let specialTaxTotal = 0

  for (const item of lineItems) {
    const itemSubtotal = item.quantity * item.unitPriceJod
    const itemDiscount = item.discountJod || 0
    const itemNetSubtotal = itemSubtotal - itemDiscount

    subtotal += itemSubtotal
    discountTotal += itemDiscount

    // Calculate taxes based on invoice type
    if (invoiceType !== 'income') {
      const generalTaxRate = item.generalTaxRate || 0
      const generalTax = itemNetSubtotal * (generalTaxRate / 100)
      generalTaxTotal += generalTax

      if (invoiceType === 'special_tax') {
        specialTaxTotal += item.specialTaxValueJod || 0
      }
    }
  }

  const grandTotal = subtotal - discountTotal + generalTaxTotal + specialTaxTotal

  return {
    subtotal: roundToTwoDecimals(subtotal),
    discountTotal: roundToTwoDecimals(discountTotal),
    generalTaxTotal: roundToTwoDecimals(generalTaxTotal),
    specialTaxTotal: roundToTwoDecimals(specialTaxTotal),
    grandTotal: roundToTwoDecimals(grandTotal)
  }
}

function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100
}

// ==========================================
// INVOICE STATUS HELPERS
// ==========================================

export async function markInvoiceAsIssued(invoiceId: string, pdfUrl: string): Promise<void> {
  const supabase = await createClient()

  // @ts-ignore - invoices table not in types until migration applied
  const { error } = await supabase
    // @ts-ignore
    .from('invoices')
    .update({
      status: 'issued',
      pdf_url: pdfUrl
    })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(`Failed to mark invoice as issued: ${error.message}`)
  }
}

export async function cancelInvoice(invoiceId: string, reason: string): Promise<void> {
  const supabase = await createClient()

  // @ts-ignore - invoices table not in types until migration applied
  const { error } = await supabase
    // @ts-ignore
    .from('invoices')
    .update({
      status: 'cancelled',
      notes: reason
    })
    .eq('id', invoiceId)
    .eq('status', 'draft') // Only allow canceling draft invoices

  if (error) {
    throw new Error(`Failed to cancel invoice: ${error.message}`)
  }
}

// ==========================================
// VALIDATION HELPERS
// ==========================================

export function validateInvoiceRequirements(
  orderTotal: number,
  buyerName: string | undefined,
  invoiceCategory: InvoiceCategory,
  buyerIdType?: BuyerIdType,
  buyerIdNumber?: string
): { valid: boolean; error?: string } {
  // Rule 1: Buyer name required for ≥10,000 JOD
  if (orderTotal >= 10000 && !buyerName) {
    return {
      valid: false,
      error: 'اسم المشتري مطلوب للفواتير بقيمة 10,000 د.أ وأكثر (Buyer name required for invoices ≥10,000 JOD)'
    }
  }

  // Rule 2: Development zone requires buyer tax number
  if (invoiceCategory === 'development_zone') {
    if (buyerIdType !== 'tax_number' || !buyerIdNumber) {
      return {
        valid: false,
        error: 'فواتير المناطق التنموية تتطلب الرقم الضريبي للمشتري (Development zone invoices require buyer tax number)'
      }
    }
  }

  return { valid: true }
}
