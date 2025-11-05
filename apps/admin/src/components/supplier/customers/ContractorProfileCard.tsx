'use client'

import Link from 'next/link'

interface ContractorProfileCardProps {
  contractor: {
    id: string
    full_name: string
    email: string
    phone: string
    created_at: string
    insights?: {
      total_orders: number
      total_spent: number
      average_order_value: number
      last_order_date: string | null
      days_since_last_order: number | null
      orders_last_30_days: number
      completed_orders: number
      disputed_orders: number
    }
    retention_score?: number
    customer_segment?: string
  }
}

export function ContractorProfileCard({ contractor }: ContractorProfileCardProps) {
  const insights = contractor.insights || {
    total_orders: 0,
    total_spent: 0,
    average_order_value: 0,
    last_order_date: null,
    days_since_last_order: null,
    orders_last_30_days: 0,
    completed_orders: 0,
    disputed_orders: 0
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'لا يوجد'
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSegmentBadge = () => {
    const segments = {
      vip: { label: 'VIP', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '👑' },
      loyal: { label: 'مخلص', color: 'bg-green-100 text-green-800 border-green-200', icon: '⭐' },
      at_risk: { label: 'معرض للخطر', color: 'bg-red-100 text-red-800 border-red-200', icon: '⚠️' },
      occasional: { label: 'عرضي', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '💼' },
      new: { label: 'جديد', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '🆕' }
    }

    const segment = segments[contractor.customer_segment as keyof typeof segments] || segments.new

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${segment.color}`}>
        <span>{segment.icon}</span>
        <span>{segment.label}</span>
      </span>
    )
  }

  const getRetentionScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getActivityStatus = () => {
    const daysSince = insights.days_since_last_order

    if (daysSince === null || daysSince === undefined) {
      return { label: 'لم يطلب بعد', color: 'text-gray-500' }
    }

    if (daysSince < 7) return { label: 'نشط جداً', color: 'text-green-600' }
    if (daysSince < 30) return { label: 'نشط', color: 'text-blue-600' }
    if (daysSince < 60) return { label: 'نشاط متوسط', color: 'text-yellow-600' }
    if (daysSince < 90) return { label: 'غير نشط', color: 'text-orange-600' }
    return { label: 'خامل', color: 'text-red-600' }
  }

  const activityStatus = getActivityStatus()
  const retentionScore = contractor.retention_score || 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {contractor.full_name}
            </h2>
            {getSegmentBadge()}
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <a href={`mailto:${contractor.email}`} className="hover:text-primary-600">
                {contractor.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span>📱</span>
              <a href={`tel:${contractor.phone}`} className="hover:text-primary-600" dir="ltr">
                {contractor.phone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>عضو منذ: {formatDate(contractor.created_at)}</span>
            </div>
          </div>
        </div>

        <Link
          href={`/supplier/customers/${contractor.id}`}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors"
        >
          عرض الملف الكامل
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">إجمالي الطلبات</div>
          <div className="text-2xl font-bold text-blue-900">{insights.total_orders}</div>
          <div className="text-xs text-blue-600 mt-1">
            {insights.completed_orders} مكتمل
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">إجمالي الإنفاق</div>
          <div className="text-2xl font-bold text-green-900">
            {insights.total_spent.toFixed(0)} د.أ
          </div>
          <div className="text-xs text-green-600 mt-1">
            منذ التسجيل
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">متوسط الطلب</div>
          <div className="text-2xl font-bold text-purple-900">
            {insights.average_order_value.toFixed(0)} د.أ
          </div>
          <div className="text-xs text-purple-600 mt-1">
            لكل طلب
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium mb-1">آخر 30 يوم</div>
          <div className="text-2xl font-bold text-yellow-900">
            {insights.orders_last_30_days}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            طلبات
          </div>
        </div>
      </div>

      {/* Activity & Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">حالة النشاط</span>
            <span className={`text-sm font-semibold ${activityStatus.color}`}>
              {activityStatus.label}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {insights.last_order_date ? (
              <>
                آخر طلب: {formatDate(insights.last_order_date)}
                {insights.days_since_last_order !== null && (
                  <> ({insights.days_since_last_order} يوم)</>
                )}
              </>
            ) : (
              'لم يتم تقديم طلبات بعد'
            )}
          </div>
        </div>

        {/* Retention Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">درجة الاحتفاظ</span>
            <span className={`text-lg font-bold ${getRetentionScoreColor(retentionScore)}`}>
              {retentionScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                retentionScore >= 80 ? 'bg-green-600' :
                retentionScore >= 60 ? 'bg-blue-600' :
                retentionScore >= 40 ? 'bg-yellow-600' :
                'bg-red-600'
              }`}
              style={{ width: `${retentionScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {insights.disputed_orders > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <span className="text-red-600">⚠️</span>
          <span className="text-sm text-red-800 font-medium">
            {insights.disputed_orders} طلب متنازع عليه
          </span>
        </div>
      )}

      {contractor.customer_segment === 'at_risk' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <span className="text-yellow-600">💡</span>
          <span className="text-sm text-yellow-800">
            عميل معرض للخطر - يُنصح بالتواصل لإعادة التفاعل
          </span>
        </div>
      )}
    </div>
  )
}