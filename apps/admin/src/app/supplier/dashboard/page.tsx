import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DashboardTabs } from '@/components/supplier/DashboardTabs'
import { AnalyticsDashboard } from '@/components/supplier/AnalyticsDashboard'
import VerificationBadges from '@/components/VerificationBadges'

async function getDashboardStats(supplierId: string) {
  const supabase = await createClient()

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // First, get all order IDs for this supplier
  const { data: supplierOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('supplier_id', supplierId)

  const orderIds = supplierOrders?.map(o => o.id) || []

  // Fetch statistics in parallel
  const [
    ordersResult,
    productsResult,
    earningsResult,
    todayOrdersResult,
    pendingOrdersResult,
    activeOrdersResult,
    deliveriesResult,
    lowStockResult
  ] = await Promise.all([
    // Total orders
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId),

    // Active products
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('is_available', true),

    // Total earnings (released payments)
    orderIds.length > 0
      ? supabase
          .from('payments')
          .select('amount_jod')
          .eq('status', 'released')
          .in('order_id', orderIds)
      : Promise.resolve({ data: [] }),

    // Today's orders
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString()),

    // Pending orders (new, not accepted yet)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('status', 'pending'),

    // Active orders (all non-terminal orders)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .in('status', ['pending', 'confirmed', 'accepted', 'in_delivery', 'awaiting_contractor_confirmation', 'delivered'] as any),

    // Today's deliveries (orders scheduled for today that are in_delivery or delivered status)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('scheduled_delivery_date', today.toISOString().split('T')[0])
      .in('status', ['in_delivery', 'delivered'] as any),

    // Low stock products (≤10 units)
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .lte('stock_quantity', 10)
      .eq('is_available', true)
  ])

  // Calculate total earnings
  const payments = earningsResult.data as Array<{ amount_jod: number }> | null
  const totalEarnings = payments?.reduce((sum, payment) => sum + payment.amount_jod, 0) || 0

  return {
    totalOrders: ordersResult.count || 0,
    activeProducts: productsResult.count || 0,
    totalEarnings,
    todayOrders: todayOrdersResult.count || 0,
    pendingOrders: pendingOrdersResult.count || 0,
    activeOrders: activeOrdersResult.count || 0,
    todayDeliveries: deliveriesResult.count || 0,
    lowStockProducts: lowStockResult.count || 0,
  }
}

async function getRecentOrders(supplierId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_jod,
      created_at,
      scheduled_delivery_date,
      scheduled_delivery_time
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(5)

  return data || []
}

export default async function SupplierDashboard({
  searchParams,
}: {
  searchParams: { verified?: string }
}) {
  const supabase = await createClient()

  // Get current user and supplier info
  const { data: { user } } = await supabase.auth.getUser()

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('supplier_id: id, business_name')
    .eq('owner_id', user?.id)
    .maybeSingle()

  // Get profile with verification status
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_verified, phone')
    .eq('id', user?.id)
    .maybeSingle()

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          خطأ: لم يتم العثور على حساب المورد
        </h2>
        <p className="text-gray-600 mb-6">
          لم نتمكن من العثور على بيانات المورد المرتبطة بحسابك
        </p>
        <a
          href="/auth/register"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          التسجيل كمورد
        </a>
      </div>
    )
  }

  const stats = await getDashboardStats(supplier.supplier_id)
  const recentOrders = await getRecentOrders(supplier.supplier_id)

  const overviewContent = (
    <div>
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Pending Orders Alert */}
        {stats.pendingOrders > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <span className="text-3xl ml-4">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  لديك {stats.pendingOrders} طلبات جديدة
                </h3>
                <p className="text-yellow-700 mb-4">
                  يرجى مراجعة الطلبات الجديدة وقبولها أو رفضها في أقرب وقت
                </p>
                <Link
                  href="/supplier/orders?status=pending"
                  className="inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                >
                  عرض الطلبات المعلقة
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Today's Deliveries Alert */}
        {stats.todayDeliveries > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <span className="text-3xl ml-4">📍</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {stats.todayDeliveries} توصيلات مجدولة لليوم
                </h3>
                <p className="text-blue-700 mb-4">
                  تأكد من تجهيز الطلبات وتنسيق التوصيل مع السائقين
                </p>
                <Link
                  href="/supplier/deliveries"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  إدارة التوصيلات
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {stats.lowStockProducts > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-start">
              <span className="text-3xl ml-4">📉</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  {stats.lowStockProducts} منتجات مخزونها منخفض
                </h3>
                <p className="text-orange-700 mb-4">
                  بعض منتجاتك أصبح مخزونها منخفضاً (≤10 وحدات). قم بتجديد المخزون
                </p>
                <Link
                  href="/supplier/products?filter=low_stock"
                  className="inline-block bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                  عرض المنتجات
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📦</span>
            <span className="text-sm text-gray-500">إجمالي</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
          <div className="text-sm text-gray-600">طلب كلي</div>
        </div>

        {/* Today's Orders */}
        <div className="bg-blue-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🆕</span>
            <span className="text-sm text-blue-600">اليوم</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.todayOrders}</div>
          <div className="text-sm text-blue-700">طلب جديد</div>
        </div>

        {/* Active Orders */}
        <div className="bg-indigo-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📋</span>
            <span className="text-sm text-indigo-600">نشط</span>
          </div>
          <div className="text-2xl font-bold text-indigo-900">{stats.activeOrders}</div>
          <div className="text-sm text-indigo-700">طلب نشط</div>
        </div>

        {/* Today's Deliveries */}
        <div className="bg-purple-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🚚</span>
            <span className="text-sm text-purple-600">توصيل</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{stats.todayDeliveries}</div>
          <div className="text-sm text-purple-700">توصيل اليوم</div>
        </div>

        {/* Active Products */}
        <div className="bg-green-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🛍️</span>
            <span className="text-sm text-green-600">نشط</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.activeProducts}</div>
          <div className="text-sm text-green-700">منتج نشط</div>
        </div>

        {/* Total Earnings */}
        <div className="bg-emerald-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">💰</span>
            <span className="text-sm text-emerald-600">الأرباح</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900">{stats.totalEarnings.toFixed(2)}</div>
          <div className="text-sm text-emerald-700">د.أ محصل</div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              آخر الطلبات
            </h2>
            <Link
              href="/supplier/orders"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              عرض الكل ←
            </Link>
          </div>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    رقم الطلب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    موعد التوصيل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    تاريخ الطلب
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.total_jod.toFixed(2)} د.أ
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(order.scheduled_delivery_date).toLocaleDateString('ar-JO')}
                      <span className="text-gray-500 text-xs block">
                        {getTimeSlotLabel(order.scheduled_delivery_time)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('ar-JO')}
                    </td>
                    <td className="px-6 py-4 text-sm text-left">
                      <Link
                        href={`/supplier/orders/${order.id}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        عرض ←
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-4 text-gray-600">لا توجد طلبات حتى الآن</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* Email Verification Success Banner */}
      {searchParams.verified === 'true' && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✅</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                تم تأكيد بريدك الإلكتروني بنجاح!
              </h3>
              <p className="text-sm text-green-800">
                يمكنك الآن قبول ورفض الطلبات وإدارة أعمالك بالكامل.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            مرحباً بك في لوحة التحكم
          </h1>
          {profile && (
            <VerificationBadges
              emailVerified={profile.email_verified}
              size="sm"
              showLabels={false}
            />
          )}
        </div>
        <p className="text-gray-600">
          {supplier.business_name} - نظرة عامة على أعمالك
        </p>
      </div>

      {/* Dashboard Tabs */}
      <DashboardTabs
        overviewContent={overviewContent}
        analyticsContent={<AnalyticsDashboard />}
      />
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'مؤكد', className: 'bg-blue-100 text-blue-800' },
    accepted: { label: 'مقبول', className: 'bg-green-100 text-green-800' },
    in_delivery: { label: 'قيد التوصيل', className: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'تم التوصيل', className: 'bg-indigo-100 text-indigo-800' },
    completed: { label: 'مكتمل', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800' },
    disputed: { label: 'متنازع عليه', className: 'bg-orange-100 text-orange-800' },
    cancelled: { label: 'ملغي', className: 'bg-gray-100 text-gray-800' },
    awaiting_contractor_confirmation: { label: 'في انتظار تأكيد العميل', className: 'bg-blue-100 text-blue-800' },
  }

  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

function getTimeSlotLabel(slot: string) {
  const slots: Record<string, string> = {
    morning: 'صباحاً (8:00 - 12:00)',
    afternoon: 'ظهراً (12:00 - 4:00)',
    evening: 'مساءً (4:00 - 8:00)',
  }
  return slots[slot] || slot
}