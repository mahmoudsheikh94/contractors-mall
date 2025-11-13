'use client'

/**
 * Invoice Section Component
 * ==========================
 *
 * Shows invoice status and generation options for an order
 * - If invoice exists: Shows invoice details with link to view
 * - If no invoice and order is delivered/completed: Shows generate button
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'

interface InvoiceSectionProps {
  orderId: string
  orderNumber: string
  orderStatus: string
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: string
  grand_total_jod: number
  general_tax_total_jod: number
  created_at: string
  status: string
}

export function InvoiceSection({ orderId, orderNumber, orderStatus }: InvoiceSectionProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const supabase = createClient()

        // @ts-ignore - invoices table not in types until migration applied
        const { data, error } = await supabase
          // @ts-ignore
          .from('invoices')
          .select('id, invoice_number, invoice_type, grand_total_jod, general_tax_total_jod, created_at, status')
          .eq('order_id', orderId)
          .eq('is_return', false)
          .maybeSingle()

        if (error) {
          console.error('Error fetching invoice:', error)
          setError('فشل تحميل بيانات الفاتورة')
          return
        }

        setInvoice(data)
      } catch (err: any) {
        console.error('Error:', err)
        setError('حدث خطأ أثناء تحميل البيانات')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoice()
  }, [orderId])

  // Only show for delivered or completed orders
  if (!['delivered', 'completed'].includes(orderStatus)) {
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جاري تحميل بيانات الفاتورة...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  // Invoice exists - show details
  if (invoice) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary-600" />
              الفاتورة
            </h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
              تم الإصدار
            </span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">رقم الفاتورة</h3>
              <p className="text-gray-900 font-mono">{invoice.invoice_number}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">نوع الفاتورة</h3>
              <p className="text-gray-900">{getInvoiceTypeLabel(invoice.invoice_type)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">المبلغ الإجمالي</h3>
              <p className="text-gray-900 font-semibold">{invoice.grand_total_jod.toFixed(2)} د.أ</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">تاريخ الإصدار</h3>
              <p className="text-gray-900">
                {new Date(invoice.created_at).toLocaleDateString('ar-JO')}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Link
              href={`/supplier/invoices/${invoice.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              <FileText className="h-5 w-5" />
              عرض الفاتورة
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // No invoice - show generate button for delivered/completed orders
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl">📄</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">
            جاهز لإصدار الفاتورة
          </h3>
          <p className="text-indigo-700 mb-4">
            الطلب مكتمل ويمكن الآن إصدار فاتورة إلكترونية متوافقة مع نظام الفوترة الأردني.
          </p>
          <div className="bg-white border border-indigo-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xl">ℹ️</span>
              <div>
                <span className="font-semibold text-indigo-900">طلب #{orderNumber}</span>
                <p className="text-indigo-700 text-xs mt-1">
                  يمكن إصدار فاتورة من نوع: فاتورة دخل، فاتورة ضريبة مبيعات، أو فاتورة ضريبة خاصة
                </p>
              </div>
            </div>
          </div>
          <Link
            href={`/supplier/invoices/generate?orderId=${orderId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            <FileText className="h-5 w-5" />
            إصدار فاتورة الآن
            <span>←</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function getInvoiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    income: 'فاتورة دخل',
    sales_tax: 'فاتورة ضريبة مبيعات',
    special_tax: 'فاتورة ضريبة خاصة',
  }
  return labels[type] || type
}
