/**
 * Generate Invoice Page
 * ====================
 *
 * Form to generate Jordan-compliant invoice from a delivered order
 *
 * Flow:
 * 1. Select delivered order (without existing invoice)
 * 2. Choose invoice type (income, sales_tax, special_tax)
 * 3. Fill buyer details (if needed for compliance)
 * 4. Preview and generate
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoiceGenerationForm } from './InvoiceGenerationForm'

export const metadata = {
  title: 'إصدار فاتورة جديدة | Generate Invoice - Contractors Mall',
  description: 'إنشاء فاتورة إلكترونية من طلب مكتمل'
}

async function getDeliveredOrders(supplierId: string) {
  const supabase = await createClient()

  // Get all delivered/completed orders that don't have an invoice yet
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_jod,
      delivery_fee_jod,
      created_at,
      delivery_address,
      contractor:profiles!contractor_id (
        id,
        full_name,
        phone,
        email,
        city
      ),
      order_items (
        id,
        quantity,
        unit_price_jod,
        total_jod,
        product:products (
          name_ar,
          name_en,
          sku
        )
      )
    `)
    .eq('supplier_id', supplierId)
    .in('status', ['delivered', 'completed'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  if (!orders || orders.length === 0) {
    return []
  }

  // Filter out orders that already have invoices
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('order_id')
    .in('order_id', orders.map(o => o.id))
    .eq('is_return', false)

  const invoicedOrderIds = new Set(existingInvoices?.map(inv => inv.order_id) || [])

  return orders.filter(order => !invoicedOrderIds.has(order.id))
}

export default async function GenerateInvoicePage() {
  const supabase = await createClient()

  // 1. Check authentication
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

  // 3. Get supplier details
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name, tax_number, tax_registration_name, tax_registration_name_en, phone, address, city')
    .eq('id', user.id)
    .single()

  if (!supplier) {
    redirect('/dashboard')
  }

  // Check if supplier has tax number
  if (!supplier.tax_number) {
    return (
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <svg className="h-16 w-16 text-red-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              الرقم الضريبي مطلوب
            </h2>
            <p className="text-gray-700 mb-6">
              لإصدار الفواتير الإلكترونية، يجب تسجيل الرقم الضريبي الخاص بك في إعدادات الملف الشخصي.
            </p>
            <a
              href="/supplier/profile"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              الذهاب إلى الملف الشخصي
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 4. Get delivered orders without invoices
  const deliveredOrders = await getDeliveredOrders(supplier.id)

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            إصدار فاتورة إلكترونية جديدة
          </h1>
          <p className="text-gray-600 mt-2">
            اختر طلباً مكتملاً لإصدار فاتورة متوافقة مع نظام الفوترة الوطني
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">
            معلومات مهمة عن الفوترة الإلكترونية
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>يمكن إصدار فاتورة واحدة فقط لكل طلب</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>الفواتير بقيمة 10,000 د.أ وأكثر تتطلب اسم المشتري</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>فواتير المناطق التنموية تتطلب الرقم الضريبي للمشتري</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>يتم احتساب ضريبة المبيعات تلقائياً (16%)</span>
            </li>
          </ul>
        </div>

        {/* Form */}
        {deliveredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              لا توجد طلبات مؤهلة لإصدار فاتورة
            </h3>
            <p className="text-gray-600 mb-6">
              لإصدار فاتورة، يجب أن يكون لديك طلبات مكتملة بدون فواتير سابقة.
            </p>
            <a
              href="/supplier/orders"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              عرض الطلبات
            </a>
          </div>
        ) : (
          <Suspense fallback={<div className="text-center py-12">جار التحميل...</div>}>
            <InvoiceGenerationForm
              orders={deliveredOrders}
              supplier={supplier}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
