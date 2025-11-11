'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  status: string
  total_jod: number
  created_at: string
  delivery_date: string
  payment_status: string
}

interface OrderHistoryTableProps {
  contractorId: string
  supplierId: string
}

export function OrderHistoryTable({ contractorId, supplierId }: OrderHistoryTableProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [stats, setStats] = useState({
    total_orders: 0,
    total_spent: 0,
    average_order_value: 0
  })
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const limit = 10

  useEffect(() => {
    fetchOrders()
  }, [page, filterStatus])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      const response = await fetch(
        `/api/supplier/contractors/${contractorId}/history?${params.toString()}`
      )
      const data = await response.json()

      if (response.ok) {
        setOrders(data.orders || [])
        setTotalOrders(data.pagination?.total || 0)
        setStats(data.stats || stats)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'تم تأكيد الطلب', color: 'bg-blue-100 text-blue-800' },
      in_delivery: { label: 'قيد التوصيل', color: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-800' },
      completed: { label: 'مكتمل', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
      disputed: { label: 'متنازع عليه', color: 'bg-orange-100 text-orange-800' },
      awaiting_contractor_confirmation: { label: 'في انتظار التأكيد', color: 'bg-blue-100 text-blue-800' }
    }

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getPaymentBadge = (paymentStatus: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
      escrow_held: { label: 'محجوز', color: 'bg-blue-100 text-blue-800' },
      released: { label: 'مدفوع', color: 'bg-green-100 text-green-800' },
      refunded: { label: 'مسترد', color: 'bg-red-100 text-red-800' }
    }

    const badge = badges[paymentStatus] || { label: paymentStatus, color: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalPages = Math.ceil(totalOrders / limit)

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-900 mb-4">سجل الطلبات</h2>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">إجمالي الطلبات</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total_orders}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600 font-medium">إجمالي الإنفاق</p>
            <p className="text-2xl font-bold text-green-900">{stats.total_spent.toFixed(0)} د.أ</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-purple-600 font-medium">متوسط الطلب</p>
            <p className="text-2xl font-bold text-purple-900">
              {stats.average_order_value.toFixed(0)} د.أ
            </p>
          </div>
        </div>

        {/* Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">فلترة حسب الحالة</label>
          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">جميع الطلبات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="confirmed">مؤكد</option>
            <option value="in_delivery">قيد التوصيل</option>
            <option value="delivered">تم التوصيل</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
            <option value="disputed">متنازع عليه</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">جاري التحميل...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl">📦</span>
            <p className="mt-2 text-gray-600">لا توجد طلبات</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  رقم الطلب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">#{order.order_number}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-gray-900">
                      {order.total_jod.toFixed(2)} د.أ
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentBadge(order.payment_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/supplier/orders/${order.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      عرض التفاصيل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            عرض {(page - 1) * limit + 1} إلى {Math.min(page * limit, totalOrders)} من {totalOrders}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <span className="px-3 py-1">
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
