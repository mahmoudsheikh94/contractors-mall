'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdvancedSearchPanel() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    searchQuery: '',
    status: [] as string[],
    paymentStatus: [] as string[],
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
    vehicleType: '',
    deliveryZone: '',
  })

  const handleSearch = () => {
    // Build query params
    const params = new URLSearchParams()

    if (filters.searchQuery.trim()) {
      params.set('q', filters.searchQuery.trim())
    }

    filters.status.forEach(s => params.append('status', s))
    filters.paymentStatus.forEach(p => params.append('paymentStatus', p))

    if (filters.minAmount) params.set('minAmount', filters.minAmount)
    if (filters.maxAmount) params.set('maxAmount', filters.maxAmount)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.vehicleType) params.set('vehicleType', filters.vehicleType)
    if (filters.deliveryZone) params.set('deliveryZone', filters.deliveryZone)

    // Navigate to search results
    router.push(`/admin/orders/search?${params.toString()}`)
  }

  const handleReset = () => {
    setFilters({
      searchQuery: '',
      status: [],
      paymentStatus: [],
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: '',
      vehicleType: '',
      deliveryZone: '',
    })
    router.push('/admin/orders')
  }

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }))
  }

  const togglePaymentStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      paymentStatus: prev.paymentStatus.includes(status)
        ? prev.paymentStatus.filter(s => s !== status)
        : [...prev.paymentStatus, status]
    }))
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>🔍</span>
        <span>{isOpen ? 'إخفاء' : 'إظهار'} البحث المتقدم</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Search Query */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                البحث النصي
              </label>
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="ابحث في رقم الطلب، العنوان، رقم الهاتف..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                يدعم البحث بالعربية والإنجليزية
              </p>
            </div>

            {/* Order Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                حالة الطلب
              </label>
              <div className="space-y-2">
                {[
                  { value: 'pending', label: 'معلق' },
                  { value: 'confirmed', label: 'تم تأكيد الطلب' },
                  { value: 'in_delivery', label: 'قيد التوصيل' },
                  { value: 'awaiting_contractor_confirmation', label: 'في انتظار التأكيد' },
                  { value: 'delivered', label: 'تم التوصيل' },
                  { value: 'completed', label: 'مكتمل' },
                  { value: 'rejected', label: 'مرفوض' },
                  { value: 'cancelled', label: 'ملغي' },
                  { value: 'disputed', label: 'متنازع عليه' },
                ].map(status => (
                  <label key={status.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                حالة الدفع
              </label>
              <div className="space-y-2">
                {[
                  { value: 'pending', label: 'معلق' },
                  { value: 'escrow_held', label: 'محتجز' },
                  { value: 'released', label: 'محرر' },
                  { value: 'refunded', label: 'مسترد' },
                ].map(status => (
                  <label key={status.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.paymentStatus.includes(status.value)}
                      onChange={() => togglePaymentStatus(status.value)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نطاق المبلغ (د.أ)
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  placeholder="الحد الأدنى"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                />
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  placeholder="الحد الأقصى"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نطاق التاريخ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">من</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">إلى</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نوع المركبة
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => setFilters(prev => ({ ...prev, vehicleType: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600"
              >
                <option value="">الكل</option>
                <option value="pickup_1t">وانيت 1 طن</option>
                <option value="truck_3_5t">شاحنة 3.5 طن</option>
                <option value="flatbed_5t">قلاب مسطح 5 طن</option>
              </select>
            </div>

            {/* Delivery Zone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                منطقة التوصيل
              </label>
              <select
                value={filters.deliveryZone}
                onChange={(e) => setFilters(prev => ({ ...prev, deliveryZone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600"
              >
                <option value="">الكل</option>
                <option value="zone_a">المنطقة أ</option>
                <option value="zone_b">المنطقة ب</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              بحث
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
