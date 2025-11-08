import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type OrderStatus = 'pending' | 'confirmed' | 'in_delivery' | 'delivered' | 'completed' | 'cancelled'

async function getOrders(filter?: string, search?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select(`
      *,
      contractor:profiles!contractor_id(
        id,
        full_name,
        email,
        phone
      ),
      supplier:suppliers!supplier_id(
        id,
        business_name,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  // Apply status filter
  if (filter && filter !== 'all') {
    query = query.eq('status', filter)
  }

  // Apply search filter
  if (search) {
    query = query.or(`order_number.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return data || []
}

export default async function OrdersManagementPage({
  searchParams,
}: {
  searchParams: { filter?: string; search?: string }
}) {
  const orders = await getOrders(searchParams.filter, searchParams.search)

  // Count by status
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length
  const inDeliveryCount = orders.filter(o => o.status === 'in_delivery').length
  const deliveredCount = orders.filter(o => o.status === 'delivered').length
  const completedCount = orders.filter(o => o.status === 'completed').length
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length

  // Calculate totals
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_jod), 0)

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إدارة الطلبات</h1>
        <p className="text-gray-600 mt-2">عرض وإدارة جميع الطلبات في المنصة</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">إجمالي الطلبات</h3>
          <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">معلقة</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">قيد التوصيل</h3>
          <p className="text-3xl font-bold text-blue-600">{inDeliveryCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">إجمالي الإيرادات</h3>
          <p className="text-3xl font-bold text-green-600">{totalRevenue.toFixed(0)} JOD</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <form className="flex-1" action="/admin/orders" method="GET">
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="ابحث برقم الطلب..."
              defaultValue={searchParams.search}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
            >
              🔍
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
          <Link
            href="/admin/orders"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              !searchParams.filter || searchParams.filter === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({orders.length})
          </Link>
          <Link
            href="/admin/orders?filter=pending"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'pending'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            معلق ({pendingCount})
          </Link>
          <Link
            href="/admin/orders?filter=confirmed"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'confirmed'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مؤكد ({confirmedCount})
          </Link>
          <Link
            href="/admin/orders?filter=in_delivery"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'in_delivery'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            قيد التوصيل ({inDeliveryCount})
          </Link>
          <Link
            href="/admin/orders?filter=delivered"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'delivered'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            تم التوصيل ({deliveredCount})
          </Link>
          <Link
            href="/admin/orders?filter=completed"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'completed'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مكتمل ({completedCount})
          </Link>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
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
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-5xl mb-4">📦</div>
                  <p className="text-lg">لا توجد طلبات</p>
                  {searchParams.search && (
                    <p className="text-sm text-gray-600 mt-2">جرب البحث بكلمات مختلفة</p>
                  )}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
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

      {/* Bulk Actions (Coming soon) */}
      {orders.length > 0 && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">إجراءات جماعية</h3>
          <p className="text-sm text-gray-600">قريباً: إمكانية تصدير، تعديل الحالة الجماعية، والمزيد</p>
        </div>
      )}
    </div>
  )
}
