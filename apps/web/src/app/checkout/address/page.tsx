'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { Button } from '@contractors-mall/ui'
import Link from 'next/link'
import type { DeliveryAddress } from '@/types/checkout'

export default function CheckoutAddressPage() {
  const router = useRouter()
  const { cart, totals } = useCart()

  const [address, setAddress] = useState<DeliveryAddress>({
    latitude: 31.9454, // Default: Amman center
    longitude: 35.9284,
    address: '',
    city: 'عمّان',
    phone: '',
  })

  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0) {
      router.push('/products')
    }
  }, [cart.items.length, router])

  // Get current location
  const handleGetCurrentLocation = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع')
      return
    }

    setUseCurrentLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddress((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }))
        setUseCurrentLocation(false)
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError('فشل تحديد الموقع. الرجاء السماح بالوصول للموقع.')
        setUseCurrentLocation(false)
      }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!address.address || !address.phone) {
      alert('الرجاء إدخال العنوان ورقم الهاتف')
      return
    }

    // Store address in localStorage for next step
    localStorage.setItem('checkout_address', JSON.stringify(address))

    // Navigate to schedule page
    router.push('/checkout/schedule')
  }

  if (cart.items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">عنوان التوصيل</h1>
            <Link href="/products">
              <Button variant="outline" size="sm">
                العودة للتسوق
              </Button>
            </Link>
          </div>

          {/* Progress Steps */}
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="text-sm font-medium text-primary-600">العنوان</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300 mx-2" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-gray-600">الموعد</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300 mx-2" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-gray-600">المراجعة</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">ملخص الطلب</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">عدد المنتجات:</span>
                <span className="font-medium">{totals.itemCount}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)} د.أ</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * رسوم التوصيل ستُحسب بناءً على العنوان
              </p>
            </div>

            {/* Location Button */}
            <div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={useCurrentLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                {useCurrentLocation ? 'جاري تحديد الموقع...' : 'استخدام موقعي الحالي'}
              </button>
              {locationError && (
                <p className="mt-2 text-sm text-red-600">{locationError}</p>
              )}
            </div>

            {/* Coordinates (readonly) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  خط العرض
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={address.latitude}
                  onChange={(e) =>
                    setAddress({ ...address, latitude: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  خط الطول
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={address.longitude}
                  onChange={(e) =>
                    setAddress({ ...address, longitude: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  readOnly
                />
              </div>
            </div>

            {/* Address Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان <span className="text-red-500">*</span>
              </label>
              <textarea
                value={address.address}
                onChange={(e) => setAddress({ ...address, address: e.target.value })}
                rows={3}
                required
                placeholder="مثال: شارع الجامعة، بجانب مسجد..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة
                </label>
                <input
                  type="text"
                  value={address.city || ''}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="عمّان"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المنطقة
                </label>
                <input
                  type="text"
                  value={address.district || ''}
                  onChange={(e) => setAddress({ ...address, district: e.target.value })}
                  placeholder="جبل الحسين"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم المبنى
                </label>
                <input
                  type="text"
                  value={address.building_number || ''}
                  onChange={(e) =>
                    setAddress({ ...address, building_number: e.target.value })
                  }
                  placeholder="12"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الطابق
                </label>
                <input
                  type="text"
                  value={address.floor || ''}
                  onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                  placeholder="3"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الشقة
                </label>
                <input
                  type="text"
                  value={address.apartment || ''}
                  onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                  placeholder="5"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                required
                placeholder="0791234567"
                pattern="[0-9]{10}"
                dir="ltr"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                سيستخدم السائق هذا الرقم للتواصل عند التوصيل
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات إضافية
              </label>
              <textarea
                value={address.notes || ''}
                onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                rows={2}
                placeholder="أي معلومات إضافية لتسهيل التوصيل..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Link href="/products" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  العودة للسلة
                </Button>
              </Link>
              <Button type="submit" variant="primary" className="flex-1">
                التالي: اختيار الموعد
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
