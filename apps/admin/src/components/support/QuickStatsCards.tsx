interface QuickStatsCardsProps {
  stats: {
    orders: {
      total: number
      recent: number
      pending: number
      disputed: number
    }
    suppliers: {
      total: number
      unverified: number
      verified: number
    }
    contractors: {
      total: number
      recent: number
    }
    disputes: {
      open: number
    }
    payments: {
      escrowAmount: number
      totalRevenue: number
    }
    activity: {
      recentCount: number
      unreadMessages: number
    }
    timeRange: string
  }
}

export default function QuickStatsCards({ stats }: QuickStatsCardsProps) {
  const timeRangeLabel = {
    '1h': 'آخر ساعة',
    '24h': 'آخر 24 ساعة',
    '7d': 'آخر 7 أيام',
    '30d': 'آخر 30 يوم',
  }[stats.timeRange] || 'آخر 24 ساعة'

  return (
    <div className="mb-8">
      <div className="mb-4">
        <p className="text-sm text-gray-600">إحصائيات {timeRangeLabel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Orders Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">الطلبات</h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.orders.total}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600 font-semibold">+{stats.orders.recent}</span>
            <span className="text-gray-500">جديد</span>
          </div>
          {stats.orders.pending > 0 && (
            <div className="mt-2 text-sm">
              <span className="text-yellow-600 font-semibold">{stats.orders.pending} معلق</span>
            </div>
          )}
          {stats.orders.disputed > 0 && (
            <div className="mt-1 text-sm">
              <span className="text-red-600 font-semibold">{stats.orders.disputed} متنازع عليه</span>
            </div>
          )}
        </div>

        {/* Suppliers Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">الموردين</h3>
            <span className="text-2xl">🏪</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.suppliers.total}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600 font-semibold">{stats.suppliers.verified}</span>
            <span className="text-gray-500">موثق</span>
          </div>
          {stats.suppliers.unverified > 0 && (
            <div className="mt-2 text-sm">
              <span className="text-orange-600 font-semibold">{stats.suppliers.unverified} بانتظار التوثيق</span>
            </div>
          )}
        </div>

        {/* Contractors Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">المقاولين</h3>
            <span className="text-2xl">👷</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.contractors.total}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600 font-semibold">+{stats.contractors.recent}</span>
            <span className="text-gray-500">جديد</span>
          </div>
        </div>

        {/* Disputes Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">النزاعات</h3>
            <span className="text-2xl">⚖️</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.disputes.open}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">مفتوحة</span>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">الإيرادات</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-3">
            {stats.payments.totalRevenue.toFixed(0)} <span className="text-lg">د.أ</span>
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-600">محتجز: </span>
              <span className="text-orange-600 font-semibold">
                {stats.payments.escrowAmount.toFixed(0)} د.أ
              </span>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">النشاط</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-3">{stats.activity.recentCount}</p>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-600">نشاط في {timeRangeLabel}</span>
            </div>
            {stats.activity.unreadMessages > 0 && (
              <div>
                <span className="text-red-600 font-semibold">
                  {stats.activity.unreadMessages} رسالة غير مقروءة
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
