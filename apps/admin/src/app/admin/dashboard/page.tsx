import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getDashboardMetrics() {
  const supabase = await createClient()

  // Get supplier counts
  const { count: totalSuppliers } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact', head: true })

  const { count: verifiedSuppliers } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)

  const { count: pendingSuppliers } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', false)

  // Get order counts
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  const { count: activeOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'confirmed', 'in_delivery'])

  const { count: completedOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  // Get payment metrics
  const { data: payments } = await supabase
    .from('payments')
    .select('amount_jod, status')

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount_jod), 0) || 0
  const heldAmount = payments?.filter(p => p.status === 'held').reduce((sum, p) => sum + Number(p.amount_jod), 0) || 0
  const releasedAmount = payments?.filter(p => p.status === 'released').reduce((sum, p) => sum + Number(p.amount_jod), 0) || 0

  // Get dispute counts
  const { count: totalDisputes } = await supabase
    .from('disputes')
    .select('*', { count: 'exact', head: true })

  const { count: activeDisputes } = await supabase
    .from('disputes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['opened', 'investigating'])

  // Get today's deliveries
  const today = new Date().toISOString().split('T')[0]
  const { count: todayDeliveries } = await supabase
    .from('deliveries')
    .select('*, orders!inner(scheduled_delivery_date)', { count: 'exact', head: true })
    .eq('orders.scheduled_delivery_date', today)

  const { count: todayCompleted } = await supabase
    .from('deliveries')
    .select('*, orders!inner(scheduled_delivery_date)', { count: 'exact', head: true })
    .eq('orders.scheduled_delivery_date', today)
    .not('completed_at', 'is', null)

  return {
    suppliers: {
      total: totalSuppliers || 0,
      verified: verifiedSuppliers || 0,
      pending: pendingSuppliers || 0,
    },
    orders: {
      total: totalOrders || 0,
      active: activeOrders || 0,
      completed: completedOrders || 0,
    },
    payments: {
      totalRevenue,
      held: heldAmount,
      released: releasedAmount,
    },
    disputes: {
      total: totalDisputes || 0,
      active: activeDisputes || 0,
    },
    deliveries: {
      today: todayDeliveries || 0,
      completed: todayCompleted || 0,
    },
  }
}

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم الرئيسية</h1>
        <p className="text-gray-600 mt-2">نظرة عامة على المنصة والإحصائيات</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Suppliers Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">الموردون</h3>
            <span className="text-2xl">🏢</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{metrics.suppliers.total}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">✓ {metrics.suppliers.verified} موثق</span>
              <span className="text-yellow-600">⏳ {metrics.suppliers.pending} معلق</span>
            </div>
          </div>
          <Link
            href="/admin/suppliers"
            className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm font-semibold"
          >
            عرض الكل ←
          </Link>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">الطلبات</h3>
            <span className="text-2xl">📦</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{metrics.orders.total}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-blue-600">🔵 {metrics.orders.active} نشط</span>
              <span className="text-green-600">✓ {metrics.orders.completed} مكتمل</span>
            </div>
          </div>
        </div>

        {/* Payments Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">المدفوعات</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{metrics.payments.totalRevenue.toFixed(0)} JOD</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">محجوز:</span>
                <span className="text-yellow-600 font-semibold">{metrics.payments.held.toFixed(0)} JOD</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">مفرج عنه:</span>
                <span className="text-green-600 font-semibold">{metrics.payments.released.toFixed(0)} JOD</span>
              </div>
            </div>
          </div>
          <Link
            href="/admin/payments"
            className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm font-semibold"
          >
            عرض الكل ←
          </Link>
        </div>

        {/* Disputes Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">النزاعات</h3>
            <span className="text-2xl">⚖️</span>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">{metrics.disputes.total}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-red-600">🔴 {metrics.disputes.active} نشط</span>
              <span className="text-gray-600">{metrics.disputes.total - metrics.disputes.active} محلول</span>
            </div>
          </div>
          <Link
            href="/admin/disputes"
            className="mt-4 inline-block text-primary-600 hover:text-primary-700 text-sm font-semibold"
          >
            عرض الكل ←
          </Link>
        </div>
      </div>

      {/* Today's Deliveries */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">توصيلات اليوم</h2>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-sm text-gray-600 mb-1">المقرر اليوم</p>
            <p className="text-3xl font-bold text-gray-900">{metrics.deliveries.today}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">المكتملة</p>
            <p className="text-3xl font-bold text-green-600">{metrics.deliveries.completed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">معدل الإنجاز</p>
            <p className="text-3xl font-bold text-primary-600">
              {metrics.deliveries.today > 0
                ? Math.round((metrics.deliveries.completed / metrics.deliveries.today) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/suppliers?filter=pending"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
          >
            <span className="text-2xl">🏢</span>
            <div>
              <p className="font-semibold text-gray-900">مراجعة الموردين الجدد</p>
              <p className="text-sm text-gray-600">{metrics.suppliers.pending} بانتظار الموافقة</p>
            </div>
          </Link>

          <Link
            href="/admin/disputes?filter=active"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
          >
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="font-semibold text-gray-900">إدارة النزاعات النشطة</p>
              <p className="text-sm text-gray-600">{metrics.disputes.active} نزاع يحتاج إجراء</p>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors"
          >
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="font-semibold text-gray-900">إعدادات النظام</p>
              <p className="text-sm text-gray-600">إدارة العتبات والرسوم</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
