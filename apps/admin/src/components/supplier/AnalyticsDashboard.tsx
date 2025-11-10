'use client'

import { useEffect, useState } from 'react'
import {
  SalesTrendChart,
  TopProductsChart,
  DeliverySuccessGauge,
  PeakHoursChart,
} from '@contractors-mall/ui'

interface AnalyticsData {
  salesTrend: Array<{
    date: string
    revenue: number
    orders: number
  }>
  topProducts: Array<{
    productId: string
    name_ar: string
    name_en: string
    revenue: number
    quantity: number
    orders: number
  }>
  avgOrderValue: number
  deliverySuccessRate: number
  contractorInsights: {
    totalContractors: number
    repeatContractors: number
    repeatRate: number
    avgLifetimeValue: number
  }
  peakHours: Array<{
    hour: number
    orders: number
  }>
  projections: {
    monthlyRevenue: number
    basedOnLast7Days: boolean
  }
  summary: {
    totalOrders: number
    totalRevenue: number
    period: {
      start: string
      end: string
    }
  }
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/supplier/analytics', {
        // Add cache busting to prevent stale data
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: فشل تحميل البيانات`)
      }

      const analyticsData = await response.json()
      setData(analyticsData)
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error('Analytics fetch error:', err)
      setError(err.message || 'فشل تحميل بيانات التحليلات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [retryCount])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <span className="text-5xl mb-4 block">⚠️</span>
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          فشل تحميل بيانات التحليلات
        </h3>
        <p className="text-sm text-red-700 mb-6">
          {error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
        </p>
        <button
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>🔄</span>
          <span>{loading ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}</span>
        </button>
      </div>
    )
  }

  // Check if supplier has any data at all
  const hasNoData = data.summary.totalOrders === 0

  if (hasNoData) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">📊</span>
        <h3 className="text-xl font-semibold text-blue-900 mb-2">
          ابدأ رحلتك مع المقاول مول
        </h3>
        <p className="text-blue-700 mb-6 max-w-md mx-auto">
          بمجرد أن تبدأ في استلام الطلبات، ستظهر هنا تحليلات شاملة لمبيعاتك وأداء منتجاتك وعملائك.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/supplier/products"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <span>🛍️</span>
            <span>أضف منتجاتك</span>
          </a>
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 bg-white border-2 border-blue-300 text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            <span>🔄</span>
            <span>تحديث</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="تحديث البيانات"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>{loading ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5">
          <div className="text-sm text-blue-600 mb-1">متوسط قيمة الطلب</div>
          <div className="text-2xl font-bold text-blue-900">{data.avgOrderValue.toFixed(2)} د.أ</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5">
          <div className="text-sm text-green-600 mb-1">إجمالي الإيرادات (30 يوم)</div>
          <div className="text-2xl font-bold text-green-900">{data.summary.totalRevenue.toFixed(2)} د.أ</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5">
          <div className="text-sm text-purple-600 mb-1">العملاء المتكررين</div>
          <div className="text-2xl font-bold text-purple-900">{data.contractorInsights.repeatRate}%</div>
          <div className="text-xs text-purple-700 mt-1">
            {data.contractorInsights.repeatContractors} من {data.contractorInsights.totalContractors}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5">
          <div className="text-sm text-amber-600 mb-1">توقع الإيرادات الشهرية</div>
          <div className="text-2xl font-bold text-amber-900">{data.projections.monthlyRevenue.toFixed(2)} د.أ</div>
          {data.projections.basedOnLast7Days && (
            <div className="text-xs text-amber-700 mt-1">بناءً على آخر 7 أيام</div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            اتجاه المبيعات (آخر 30 يوم)
          </h3>
          {data.salesTrend.length > 0 ? (
            <SalesTrendChart data={data.salesTrend} height={300} />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            أفضل 5 منتجات حسب الإيرادات
          </h3>
          {data.topProducts.length > 0 ? (
            <TopProductsChart data={data.topProducts} height={300} />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>

        {/* Delivery Success Gauge */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            معدل نجاح التوصيل
          </h3>
          <DeliverySuccessGauge successRate={data.deliverySuccessRate} height={250} />
          <div className="mt-4 text-sm text-gray-600 text-center">
            {data.deliverySuccessRate >= 90 && '🎉 أداء ممتاز! استمر في تقديم خدمة عالية الجودة'}
            {data.deliverySuccessRate >= 70 && data.deliverySuccessRate < 90 && '👍 أداء جيد، هناك فرصة للتحسين'}
            {data.deliverySuccessRate < 70 && '⚠️ يحتاج إلى تحسين - راجع عملية التوصيل'}
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            أوقات الذروة للطلبات
          </h3>
          {data.peakHours.some((h) => h.orders > 0) ? (
            <>
              <PeakHoursChart data={data.peakHours} height={250} />
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>ذروة عالية</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>ذروة متوسطة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span>ذروة منخفضة</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </div>

      {/* Customer Insights Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          رؤى حول العملاء
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-900">
              {data.contractorInsights.totalContractors}
            </div>
            <div className="text-sm text-blue-700 mt-1">إجمالي العملاء</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-900">
              {data.contractorInsights.repeatContractors}
            </div>
            <div className="text-sm text-purple-700 mt-1">عملاء متكررين</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-900">
              {data.contractorInsights.avgLifetimeValue.toFixed(2)} د.أ
            </div>
            <div className="text-sm text-green-700 mt-1">متوسط قيمة العميل الدائمة</div>
          </div>
        </div>
      </div>
    </div>
  )
}
