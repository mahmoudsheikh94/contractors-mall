/**
 * Invoice Detail Page
 * ===================
 *
 * View full Jordan e-invoice details with all compliance fields
 * Supplier can download PDF, view line items, and check status
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Download, FileText, Calendar, User, Building2, Receipt } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: {
    id: string
  }
}

async function getInvoice(invoiceId: string, supplierId: string) {
  const supabase = await createClient()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_line_items (
        *,
        product:products (
          name_ar,
          sku
        )
      ),
      order:orders (
        order_number,
        delivery_address
      )
    `)
    .eq('id', invoiceId)
    .eq('supplier_id', supplierId)
    .single()

  if (error) {
    console.error('Error fetching invoice:', error)
    return null
  }

  return invoice
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // 1. Authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 2. Verify supplier role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'supplier_admin') {
    redirect('/dashboard')
  }

  // 3. Fetch invoice
  const invoice = await getInvoice(params.id, user.id)

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="max-w-2xl mx-auto text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            الفاتورة غير موجودة
          </h2>
          <p className="text-gray-600 mb-6">
            لم نتمكن من العثور على الفاتورة المطلوبة
          </p>
          <Link
            href="/supplier/invoices"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            العودة إلى الفواتير
          </Link>
        </div>
      </div>
    )
  }

  const order = Array.isArray(invoice.order) ? invoice.order[0] : invoice.order
  const lineItems = invoice.invoice_line_items || []

  const invoiceTypeLabels = {
    income: 'فاتورة ضريبة دخل',
    sales_tax: 'فاتورة ضريبة مبيعات',
    special_tax: 'فاتورة ضريبة خاصة'
  }

  const invoiceCategoryLabels = {
    local: 'فاتورة محلية',
    export: 'فاتورة تصدير',
    development_zone: 'فاتورة مناطق تنموية'
  }

  const statusLabels = {
    draft: 'مسودة',
    issued: 'صادرة',
    submitted_to_portal: 'مرسلة للبوابة',
    cancelled: 'ملغاة'
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    issued: 'bg-green-100 text-green-800',
    submitted_to_portal: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/supplier/invoices"
            className="text-blue-600 hover:text-blue-800"
          >
            ← العودة إلى الفواتير
          </Link>

          <div className="flex gap-3">
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                <span>تحميل PDF</span>
              </a>
            )}
          </div>
        </div>

        {/* Invoice Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {invoiceTypeLabels[invoice.invoice_type as keyof typeof invoiceTypeLabels]}
                </h1>
                <p className="text-blue-100">
                  {invoiceCategoryLabels[invoice.invoice_category as keyof typeof invoiceCategoryLabels]}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm text-blue-100">رقم الفاتورة</p>
                <p className="text-2xl font-bold">{invoice.invoice_number}</p>
                {invoice.electronic_invoice_number && (
                  <p className="text-xs text-blue-100 mt-1">
                    {invoice.electronic_invoice_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[invoice.status as keyof typeof statusColors]}`}>
                {statusLabels[invoice.status as keyof typeof statusLabels]}
              </span>
            </div>

            {/* Invoice Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Seller Info */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span>بيانات البائع</span>
                </h3>
                <div className="space-y-2 text-sm">
                  <InfoRow label="الاسم التجاري" value={invoice.seller_name} />
                  {invoice.seller_name_en && (
                    <InfoRow label="الاسم بالإنجليزية" value={invoice.seller_name_en} />
                  )}
                  <InfoRow label="الرقم الضريبي" value={invoice.seller_tax_number} bold />
                  {invoice.seller_phone && <InfoRow label="الهاتف" value={invoice.seller_phone} />}
                  {invoice.seller_address && <InfoRow label="العنوان" value={invoice.seller_address} />}
                  {invoice.seller_city && <InfoRow label="المدينة" value={invoice.seller_city} />}
                </div>
              </div>

              {/* Buyer Info */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>بيانات المشتري</span>
                </h3>
                <div className="space-y-2 text-sm">
                  <InfoRow label="الاسم" value={invoice.buyer_name || '-'} />
                  {invoice.buyer_id_type && invoice.buyer_id_number && (
                    <InfoRow
                      label={invoice.buyer_id_type === 'tax_number' ? 'الرقم الضريبي' : invoice.buyer_id_type === 'national_id' ? 'الرقم الوطني' : 'الرقم الشخصي'}
                      value={invoice.buyer_id_number}
                    />
                  )}
                  {invoice.buyer_phone && <InfoRow label="الهاتف" value={invoice.buyer_phone} />}
                  {invoice.buyer_city && <InfoRow label="المدينة" value={invoice.buyer_city} />}
                  {invoice.buyer_postal_code && <InfoRow label="الرمز البريدي" value={invoice.buyer_postal_code} />}
                </div>
              </div>

              {/* Invoice Details */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>تفاصيل الفاتورة</span>
                </h3>
                <div className="space-y-2 text-sm">
                  <InfoRow
                    label="تاريخ الإصدار"
                    value={new Date(invoice.issue_date).toLocaleDateString('ar-JO')}
                  />
                  <InfoRow label="العملة" value={invoice.currency} />
                  {order && <InfoRow label="رقم الطلب" value={order.order_number} />}
                </div>
              </div>

              {/* Submission Info (if applicable) */}
              {invoice.status === 'submitted_to_portal' && (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <span>معلومات الإرسال</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    {invoice.submitted_at && (
                      <InfoRow
                        label="تاريخ الإرسال"
                        value={new Date(invoice.submitted_at).toLocaleDateString('ar-JO')}
                      />
                    )}
                    {invoice.electronic_invoice_number && (
                      <InfoRow label="الرقم الإلكتروني" value={invoice.electronic_invoice_number} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">
                عناصر الفاتورة
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">الوصف</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">الكمية</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">سعر الوحدة</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">الخصم</th>
                      {invoice.invoice_type !== 'income' && (
                        <th className="px-4 py-2 text-right font-medium text-gray-700">الضريبة</th>
                      )}
                      <th className="px-4 py-2 text-right font-medium text-gray-700">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lineItems.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-gray-700">{parseFloat(item.quantity).toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-700">{parseFloat(item.unit_price_jod).toFixed(2)} د.أ</td>
                        <td className="px-4 py-3 text-gray-700">{parseFloat(item.discount_jod || 0).toFixed(2)} د.أ</td>
                        {invoice.invoice_type !== 'income' && (
                          <td className="px-4 py-3 text-gray-700">
                            {parseFloat(item.general_tax_amount_jod || 0).toFixed(2)} د.أ
                            {item.general_tax_rate > 0 && ` (${parseFloat(item.general_tax_rate).toFixed(0)}%)`}
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-gray-900">{parseFloat(item.line_total_jod).toFixed(2)} د.أ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full md:w-96 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium">{parseFloat(invoice.subtotal_jod).toFixed(2)} د.أ</span>
                </div>
                {parseFloat(invoice.discount_total_jod) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>الخصم:</span>
                    <span>-{parseFloat(invoice.discount_total_jod).toFixed(2)} د.أ</span>
                  </div>
                )}
                {invoice.invoice_type !== 'income' && parseFloat(invoice.general_tax_total_jod) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ضريبة المبيعات العامة:</span>
                    <span className="font-medium">{parseFloat(invoice.general_tax_total_jod).toFixed(2)} د.أ</span>
                  </div>
                )}
                {invoice.invoice_type === 'special_tax' && parseFloat(invoice.special_tax_total_jod) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الضريبة الخاصة:</span>
                    <span className="font-medium">{parseFloat(invoice.special_tax_total_jod).toFixed(2)} د.أ</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>الإجمالي:</span>
                  <span className="text-blue-600">{parseFloat(invoice.grand_total_jod).toFixed(2)} د.أ</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">ملاحظات:</h4>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-900'}>{value}</span>
    </div>
  )
}
