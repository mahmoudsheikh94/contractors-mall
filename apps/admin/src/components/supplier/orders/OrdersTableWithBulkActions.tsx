'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Order {
  order_id: string
  order_number: string
  status: string
  total_jod: number
  delivery_fee_jod: number
  created_at: string
  delivery_date: string
  delivery_time_slot: string
  contractor: {
    full_name: string
    phone: string
  } | null
}

interface OrdersTableWithBulkActionsProps {
  orders: Order[]
  searchParams?: {
    status?: string
    search?: string
  }
}

export function OrdersTableWithBulkActions({ orders, searchParams }: OrdersTableWithBulkActionsProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const toggleAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map(o => o.order_id)))
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)

      // Build query params
      const params = new URLSearchParams()
      if (searchParams?.status && searchParams.status !== 'all') {
        params.set('status', searchParams.status)
      }

      const response = await fetch(`/api/supplier/orders/export?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to export orders')
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Export error:', err)
      alert(err.message || 'فشل تصدير الطلبات')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    if (selectedOrders.size === 0) {
      alert('يرجى اختيار طلب واحد على الأقل')
      return
    }

    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.order_id))

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>قوائم التعبئة</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .order { page-break-after: always; margin-bottom: 40px; border: 2px solid #000; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .section { margin-bottom: 15px; }
          .label { font-weight: bold; display: inline-block; width: 150px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: right; }
          th { background-color: #f0f0f0; }
          @media print { .order { page-break-after: always; } }
        </style>
      </head>
      <body>
        ${selectedOrdersList.map(order => `
          <div class="order">
            <div class="header">
              <h1>قائمة تعبئة</h1>
              <h2>طلب #${order.order_number}</h2>
            </div>
            <div class="section">
              <div><span class="label">تاريخ الطباعة:</span> ${new Date().toLocaleString('ar-JO')}</div>
            </div>
            <div class="section">
              <h3>معلومات العميل:</h3>
              <div><span class="label">الاسم:</span> ${order.contractor?.full_name || 'N/A'}</div>
              <div><span class="label">الهاتف:</span> ${order.contractor?.phone || 'N/A'}</div>
            </div>
            <div class="section">
              <h3>معلومات التوصيل:</h3>
              <div><span class="label">تاريخ التوصيل:</span> ${new Date(order.delivery_date).toLocaleDateString('ar-JO')}</div>
              <div><span class="label">وقت التوصيل:</span> ${getTimeSlotLabel(order.delivery_time_slot)}</div>
            </div>
            <div class="section">
              <h3>ملخص الطلب:</h3>
              <div><span class="label">المجموع:</span> ${order.total_jod.toFixed(2)} د.أ</div>
              <div><span class="label">رسوم التوصيل:</span> ${order.delivery_fee_jod.toFixed(2)} د.أ</div>
            </div>
            <div class="section">
              <p style="margin-top: 40px; border-top: 1px solid #000; padding-top: 10px;">
                <strong>توقيع المستلم:</strong> _____________________
                <strong style="margin-right: 40px;">التاريخ:</strong> _____________________
              </p>
            </div>
          </div>
        `).join('')}
        <script>window.print(); window.onafterprint = function() { window.close(); }</script>
      </body>
      </html>
    `)

    printWindow.document.close()
  }

  return (
    <div>
      {/* Bulk Actions Bar */}
      {(selectedOrders.size > 0 || orders.length > 0) && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {orders.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  {selectedOrders.size > 0
                    ? `تم اختيار ${selectedOrders.size} طلب`
                    : 'اختيار الكل'}
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
            </button>

            {selectedOrders.size > 0 && (
              <button
                onClick={handlePrint}
                className="text-sm font-medium text-primary-700 hover:text-primary-800 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 hover:bg-primary-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة قوائم التعبئة ({selectedOrders.size})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-right w-12">
                {/* Checkbox column */}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                رقم الطلب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                العميل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                المبلغ الإجمالي
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                موعد التوصيل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                تاريخ الطلب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.order_id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.order_id)}
                    onChange={() => toggleOrder(order.order_id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    #{order.order_number}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {order.contractor?.full_name || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.contractor?.phone}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-gray-900">
                    {order.total_jod.toFixed(2)} د.أ
                  </div>
                  <div className="text-xs text-gray-500">
                    توصيل: {order.delivery_fee_jod.toFixed(2)} د.أ
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {new Date(order.delivery_date).toLocaleDateString('ar-JO')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getTimeSlotLabel(order.delivery_time_slot)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('ar-JO')}
                  <div className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString('ar-JO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Link
                      href={`/supplier/orders/${order.order_id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
                    >
                      عرض التفاصيل
                    </Link>
                    {order.status === 'confirmed' && (
                      <Link
                        href={`/supplier/orders/${order.order_id}#actions`}
                        className="text-green-600 hover:text-green-700 text-sm font-semibold"
                      >
                        قبول/رفض
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'تم تأكيد الطلب', className: 'bg-blue-100 text-blue-800' },
    in_delivery: { label: 'قيد التوصيل', className: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'تم التوصيل', className: 'bg-indigo-100 text-indigo-800' },
    completed: { label: 'مكتمل', className: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800' },
    disputed: { label: 'متنازع عليه', className: 'bg-yellow-100 text-yellow-800' },
    cancelled: { label: 'ملغي', className: 'bg-gray-100 text-gray-800' },
    awaiting_contractor_confirmation: { label: 'في انتظار التأكيد', className: 'bg-blue-100 text-blue-800' },
  }

  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

function getTimeSlotLabel(slot: string) {
  const slots: Record<string, string> = {
    morning: 'صباحاً (8-12)',
    afternoon: 'ظهراً (12-4)',
    evening: 'مساءً (4-8)',
  }
  return slots[slot] || slot
}
