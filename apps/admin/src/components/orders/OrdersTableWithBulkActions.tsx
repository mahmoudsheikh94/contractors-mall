'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/monitoring'

type Order = {
  id: string
  order_number: string
  status: string
  payment_status: string
  total_jod: number
  subtotal_jod: number
  delivery_fee_jod: number
  scheduled_delivery_date: string
  delivery_time_slot?: string
  contractor?: {
    id: string
    full_name: string
    phone: string
    email: string
  }
  supplier?: {
    id: string
    business_name: string
    phone: string
  }
}

interface OrdersTableWithBulkActionsProps {
  orders: Order[]
  currentFilters?: {
    filter?: string
    search?: string
  }
}

export default function OrdersTableWithBulkActions({
  orders,
  currentFilters,
}: OrdersTableWithBulkActionsProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [bulkAction, setBulkAction] = useState('')

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)))
    }
  }

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Build export URL with current filters
      const params = new URLSearchParams()
      if (currentFilters?.filter && currentFilters.filter !== 'all') {
        params.set('status', currentFilters.filter)
      }
      if (currentFilters?.search) {
        params.set('search', currentFilters.search)
      }

      const response = await fetch(`/api/admin/orders/export?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to export orders')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      trackEvent('Admin: Export Orders', {
        count: orders.length,
        filters: currentFilters
      }, 'info')

      alert('تم تصدير الطلبات بنجاح')
    } catch (error) {
      console.error('Export error:', error)
      alert('فشل تصدير الطلبات')
    } finally {
      setIsExporting(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkAction || selectedOrders.size === 0) {
      alert('الرجاء اختيار الطلبات والإجراء المطلوب')
      return
    }

    if (!confirm(`هل أنت متأكد من تحديث ${selectedOrders.size} طلب؟`)) {
      return
    }

    setIsBulkUpdating(true)
    try {
      const updates: any = {}

      // Parse bulk action format: field:value
      const [field, value] = bulkAction.split(':')
      updates[field] = value

      const response = await fetch('/api/admin/orders/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          updates,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to bulk update orders')
      }

      trackEvent('Admin: Bulk Update Orders', {
        count: selectedOrders.size,
        updates,
        success_count: result.summary.succeeded,
        failed_count: result.summary.failed,
      }, 'info')

      alert(`تم تحديث ${result.summary.succeeded} طلب بنجاح`)

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error: any) {
      console.error('Bulk update error:', error)
      alert('فشل التحديث الجماعي: ' + error.message)
    } finally {
      setIsBulkUpdating(false)
    }
  }

  return (
    <div>
      {/* Bulk Actions Toolbar */}
      {selectedOrders.size > 0 && (
        <div className="mb-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold text-primary-900">
                تم اختيار {selectedOrders.size} طلب
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">اختر الإجراء</option>
                <optgroup label="تغيير الحالة">
                  <option value="status:confirmed">تأكيد</option>
                  <option value="status:in_delivery">قيد التوصيل</option>
                  <option value="status:delivered">تم التوصيل</option>
                  <option value="status:cancelled">إلغاء</option>
                </optgroup>
              </select>

              <button
                onClick={handleBulkUpdate}
                disabled={!bulkAction || isBulkUpdating}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBulkUpdating ? 'جاري التحديث...' : 'تطبيق'}
              </button>

              <button
                onClick={() => setSelectedOrders(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>📊</span>
          <span>{isExporting ? 'جاري التصدير...' : 'تصدير إلى Excel'}</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === orders.length && orders.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                رقم الطلب
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                المقاول
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                المورد
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                الإجمالي
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                الحالة
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                تاريخ التوصيل
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-5xl mb-4">📦</div>
                  <p className="text-lg">لا توجد طلبات</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-primary-600 hover:text-primary-700"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{order.contractor?.full_name}</p>
                      <p className="text-sm text-gray-600">{order.contractor?.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{order.supplier?.business_name}</p>
                      <p className="text-sm text-gray-600">{order.supplier?.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{Number(order.total_jod).toFixed(2)} JOD</p>
                    <p className="text-sm text-gray-600">
                      {Number(order.subtotal_jod).toFixed(2)} + {Number(order.delivery_fee_jod).toFixed(2)} توصيل
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {order.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                        ⏳ معلق
                      </span>
                    )}
                    {order.status === 'confirmed' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                        ✓ مؤكد
                      </span>
                    )}
                    {order.status === 'in_delivery' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                        🚚 قيد التوصيل
                      </span>
                    )}
                    {order.status === 'delivered' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        📦 تم التوصيل
                      </span>
                    )}
                    {order.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        ✅ مكتمل
                      </span>
                    )}
                    {order.status === 'cancelled' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                        ❌ ملغي
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {new Date(order.scheduled_delivery_date).toLocaleDateString('ar-JO')}
                    </p>
                    {order.delivery_time_slot && (
                      <p className="text-xs text-gray-600">{order.delivery_time_slot}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <span>عرض</span>
                      <span>←</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
