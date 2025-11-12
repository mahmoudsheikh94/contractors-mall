/**
 * Supplier Invoices Page
 * =====================
 *
 * Jordan e-invoicing system - List and manage invoices
 * Suppliers can view their invoices, generate new ones, and export to PDF
 *
 * Features:
 * - Invoice list with filters (status, date range, invoice type)
 * - Search by invoice number or order number
 * - Generate invoice from delivered orders
 * - Download invoice PDF
 * - Export to Excel
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Download,
  Filter,
  Search,
  Calendar
} from 'lucide-react'

export const metadata = {
  title: 'الفواتير | Invoices - Contractors Mall',
  description: 'إدارة الفواتير الإلكترونية'
}

interface SearchParams {
  status?: string
  type?: string
  search?: string
  from?: string
  to?: string
}

async function getInvoices(supplierId: string, searchParams: SearchParams) {
  const supabase = await createClient()

  // @ts-ignore - invoices table not in types until migration applied
  let query = supabase
    // @ts-ignore
    .from('invoices')
    .select(`
      id,
      invoice_number,
      electronic_invoice_number,
      order_id,
      invoice_type,
      invoice_category,
      issue_date,
      buyer_name,
      subtotal_jod,
      general_tax_total_jod,
      special_tax_total_jod,
      grand_total_jod,
      status,
      created_at,
      order:orders (
        order_number,
        status
      )
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (searchParams.status) {
    query = (query as any).eq('status', searchParams.status)
  }

  if (searchParams.type) {
    query = (query as any).eq('invoice_type', searchParams.type)
  }

  if (searchParams.search) {
    query = (query as any).or(`invoice_number.ilike.%${searchParams.search}%,electronic_invoice_number.ilike.%${searchParams.search}%`)
  }

  if (searchParams.from) {
    query = (query as any).gte('issue_date', searchParams.from)
  }

  if (searchParams.to) {
    query = (query as any).lte('issue_date', searchParams.to)
  }

  // @ts-ignore - Complex nested query causes type inference issues
  const { data, error } = await query

  if (error) {
    console.error('Error fetching invoices:', error)
    return []
  }

  return data || []
}

async function getInvoiceStats(supplierId: string) {
  const supabase = await createClient()

  // @ts-ignore - invoices table not in types until migration applied
  const { data, error } = await supabase
    // @ts-ignore
    .from('invoices')
    .select('status, grand_total_jod')
    .eq('supplier_id', supplierId)

  if (error || !data) {
    return {
      total: 0,
      draft: 0,
      issued: 0,
      submitted: 0,
      totalAmount: 0
    }
  }

  const invoices = data as any

  return {
    total: invoices.length,
    draft: invoices.filter((i: any) => i.status === 'draft').length,
    issued: invoices.filter((i: any) => i.status === 'issued').length,
    submitted: invoices.filter((i: any) => i.status === 'submitted_to_portal').length,
    totalAmount: invoices.reduce((sum: number, i: any) => sum + parseFloat(i.grand_total_jod.toString()), 0)
  }
}

export default async function SupplierInvoicesPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()

  // 1. Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
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

  // 3. Get supplier ID from suppliers table
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name, tax_number')
    .eq('id', user.id)
    .single()

  if (!supplier) {
    redirect('/dashboard')
  }

  // 4. Fetch invoices and stats
  const [invoices, stats] = await Promise.all([
    getInvoices(supplier.id, searchParams),
    getInvoiceStats(supplier.id)
  ])

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              الفواتير الإلكترونية
            </h1>
            <p className="text-gray-600 mt-2">
              نظام الفوترة الوطني - وزارة المالية الأردنية
            </p>
          </div>

          <Link
            href="/supplier/invoices/generate"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>إصدار فاتورة جديدة</span>
          </Link>
        </div>

        {/* Tax Number Warning */}
        {!supplier.tax_number && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  الرقم الضريبي مطلوب لإصدار الفواتير
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  يرجى إضافة الرقم الضريبي في{' '}
                  <Link href="/supplier/profile" className="underline font-medium">
                    إعدادات الملف الشخصي
                  </Link>
                  {' '}لتتمكن من إصدار الفواتير الإلكترونية.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="إجمالي الفواتير"
          value={stats.total}
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="مسودة"
          value={stats.draft}
          icon={FileText}
          color="gray"
        />
        <StatsCard
          title="صادرة"
          value={stats.issued}
          icon={FileText}
          color="green"
        />
        <StatsCard
          title="إجمالي القيمة"
          value={`${stats.totalAmount.toFixed(2)} د.أ`}
          icon={FileText}
          color="purple"
          isAmount
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              بحث
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchParams.search}
                placeholder="رقم الفاتورة أو رقم الطلب"
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة
            </label>
            <select
              name="status"
              defaultValue={searchParams.status}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">الكل</option>
              <option value="draft">مسودة</option>
              <option value="issued">صادرة</option>
              <option value="submitted_to_portal">مرسلة للبوابة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>

          {/* Invoice Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الفاتورة
            </label>
            <select
              name="type"
              defaultValue={searchParams.type}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">الكل</option>
              <option value="income">فاتورة دخل</option>
              <option value="sales_tax">فاتورة ضريبة مبيعات</option>
              <option value="special_tax">فاتورة ضريبة خاصة</option>
            </select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>تطبيق الفلتر</span>
            </button>
          </div>
        </form>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الطلب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">لا توجد فواتير</p>
                    <p className="text-sm mt-2">ابدأ بإصدار فاتورة من طلب مكتمل</p>
                  </td>
                </tr>
              ) : (
                (invoices as any).map((invoice: any) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  isAmount = false
}: {
  title: string
  value: number | string
  icon: any
  color: 'blue' | 'gray' | 'green' | 'purple'
  isAmount?: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold mt-2 ${isAmount ? 'text-purple-600' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function InvoiceRow({ invoice }: { invoice: any }) {
  const order = Array.isArray(invoice.order) ? invoice.order[0] : invoice.order

  const invoiceTypeLabels = {
    income: 'فاتورة دخل',
    sales_tax: 'فاتورة ضريبة مبيعات',
    special_tax: 'فاتورة ضريبة خاصة'
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    issued: 'bg-green-100 text-green-800',
    submitted_to_portal: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  const statusLabels = {
    draft: 'مسودة',
    issued: 'صادرة',
    submitted_to_portal: 'مرسلة',
    cancelled: 'ملغاة'
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <Link
          href={`/supplier/invoices/${invoice.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {invoice.invoice_number}
        </Link>
        {invoice.electronic_invoice_number && (
          <p className="text-xs text-gray-500 mt-1">
            {invoice.electronic_invoice_number}
          </p>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Link
          href={`/supplier/orders/${invoice.order_id}`}
          className="text-gray-900 hover:text-blue-600"
        >
          {order?.order_number || '-'}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {invoiceTypeLabels[invoice.invoice_type as keyof typeof invoiceTypeLabels]}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {invoice.buyer_name || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {parseFloat(invoice.grand_total_jod).toFixed(2)} د.أ
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {new Date(invoice.issue_date).toLocaleDateString('ar-JO')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[invoice.status as keyof typeof statusColors]}`}>
          {statusLabels[invoice.status as keyof typeof statusLabels]}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center gap-2">
          <Link
            href={`/supplier/invoices/${invoice.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            عرض
          </Link>
          {invoice.pdf_url && (
            <a
              href={invoice.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}
