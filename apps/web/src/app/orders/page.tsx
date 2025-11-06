'use client'

/**
 * Orders List Page
 *
 * Displays all contractor's orders with filtering by status (active/completed).
 * Shows order summary cards with status, supplier, amount, and delivery date.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type OrderStatus = 'confirmed' | 'accepted' | 'in_delivery' | 'delivered' | 'completed' | 'rejected' | 'disputed'

interface OrderSummary {
  order_id: string
  order_number: string
  status: OrderStatus
  total_jod: number
  delivery_date: string
  delivery_time_slot: string
  created_at: string
  supplier: {
    business_name: string
    business_name_en: string
  }
  payment: {
    status: string
  }
}

type TabType = 'active' | 'past'

export default function OrdersListPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('active')

  useEffect(() => {
    async function fetchOrders() {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          setError('الرجاء تسجيل الدخول')
          setLoading(false)
          return
        }

        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            total_jod,
            scheduled_delivery_date,
            scheduled_delivery_time,
            created_at,
            suppliers (
              business_name,
              business_name_en
            ),
            payments (
              status
            )
          `)
          .eq('contractor_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        // Transform data
        const ordersList: OrderSummary[] = data?.map((order: any) => ({
          order_id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_jod: order.total_jod,
          delivery_date: order.scheduled_delivery_date,
          delivery_time_slot: order.scheduled_delivery_time,
          created_at: order.created_at,
          supplier: order.suppliers ? {
            business_name: order.suppliers.business_name,
            business_name_en: order.suppliers.business_name_en,
          } : {
            business_name: 'Unknown Supplier',
            business_name_en: 'Unknown Supplier',
          },
          payment: order.payments ? {
            status: order.payments.status,
          } : {
            status: 'pending',
          },
        })) || []

        setOrders(ordersList)
      } catch (err) {
        console.error('Error fetching orders:', err)
        setError('فشل تحميل الطلبات')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const activeOrders = orders.filter(order =>
    ['confirmed', 'accepted', 'in_delivery', 'delivered'].includes(order.status)
  )

  const pastOrders = orders.filter(order =>
    ['completed', 'rejected', 'disputed'].includes(order.status)
  )

  const displayedOrders = activeTab === 'active' ? activeOrders : pastOrders

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل الطلبات...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">خطأ</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">طلباتي</h1>
          <p className="text-gray-600 mt-1">تتبع جميع طلباتك وحالة التوصيل</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'active'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الطلبات النشطة ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'past'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الطلبات السابقة ({pastOrders.length})
            </button>
          </div>
        </div>

        {/* Orders List */}
        {displayedOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'active' ? 'لا توجد طلبات نشطة' : 'لا توجد طلبات سابقة'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'active'
                ? 'ابدأ بتصفح المنتجات وإضافتها للسلة لإنشاء طلب جديد'
                : 'ستظهر الطلبات المكتملة والملغاة هنا'
              }
            </p>
            {activeTab === 'active' && (
              <Link
                href="/"
                className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
              >
                تصفح المنتجات
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((order) => (
              <OrderCard key={order.order_id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Order Card Component
 * Displays summary of a single order
 */
function OrderCard({ order }: { order: OrderSummary }) {
  const statusConfig = getStatusConfig(order.status)

  const timeSlotDisplay = {
    morning: 'صباحاً (8:00 - 12:00)',
    afternoon: 'ظهراً (12:00 - 4:00)',
    evening: 'مساءً (4:00 - 8:00)',
  }[order.delivery_time_slot] || order.delivery_time_slot

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const isToday = (dateStr: string) => {
    const today = new Date()
    const orderDate = new Date(dateStr)
    return (
      today.getFullYear() === orderDate.getFullYear() &&
      today.getMonth() === orderDate.getMonth() &&
      today.getDate() === orderDate.getDate()
    )
  }

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const orderDate = new Date(dateStr)
    return (
      tomorrow.getFullYear() === orderDate.getFullYear() &&
      tomorrow.getMonth() === orderDate.getMonth() &&
      tomorrow.getDate() === orderDate.getDate()
    )
  }

  const getDateDisplay = (dateStr: string) => {
    if (isToday(dateStr)) return 'اليوم'
    if (isTomorrow(dateStr)) return 'غداً'
    return formatDate(dateStr)
  }

  return (
    <Link
      href={`/orders/${order.order_id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">
              طلب رقم #{order.order_number}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}
            >
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
          <p className="text-gray-600">{order.supplier.business_name}</p>
        </div>
        <div className="text-left">
          <div className="text-2xl font-bold text-gray-900">{order.total_jod.toFixed(2)} د.أ</div>
        </div>
      </div>

      {/* Delivery Info */}
      {order.status !== 'rejected' && order.status !== 'completed' && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">موعد التوصيل المتوقع</p>
              <p className="font-semibold text-gray-900">
                {getDateDisplay(order.delivery_date)} • {timeSlotDisplay}
              </p>
            </div>
            {order.status === 'in_delivery' && (
              <div className="text-3xl">🚚</div>
            )}
          </div>
        </div>
      )}

      {/* Payment Status */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          حالة الدفع: <span className="font-semibold">{getPaymentStatusLabel(order.payment.status)}</span>
        </div>
        <div className="text-primary-600 font-semibold text-sm">
          عرض التفاصيل ←
        </div>
      </div>
    </Link>
  )
}

/**
 * Get status configuration for display
 */
function getStatusConfig(status: OrderStatus) {
  const configs = {
    confirmed: {
      label: 'مؤكد',
      icon: '✓',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
    },
    accepted: {
      label: 'قبِل من المورد',
      icon: '✓✓',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    in_delivery: {
      label: 'قيد التوصيل',
      icon: '🚚',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
    },
    delivered: {
      label: 'تم التوصيل',
      icon: '📦',
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-800',
    },
    completed: {
      label: 'مكتمل',
      icon: '✓',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    rejected: {
      label: 'مرفوض',
      icon: '✗',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
    },
    disputed: {
      label: 'متنازع عليه',
      icon: '⚠️',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
    },
  }

  return configs[status] || configs.confirmed
}

/**
 * Get payment status label in Arabic
 */
function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'قيد الانتظار',
    escrow_held: 'محجوز في الضمان',
    released: 'تم التحويل',
    refunded: 'مسترد',
    failed: 'فشل',
  }

  return labels[status] || status
}
