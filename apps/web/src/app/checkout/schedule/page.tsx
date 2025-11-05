'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { Button } from '@contractors-mall/ui'
import Link from 'next/link'
import type { DeliveryAddress, DeliverySchedule } from '@/types/checkout'

const TIME_SLOTS = [
  { value: 'morning', label: 'صباحاً (8:00 - 12:00)', labelEn: 'Morning (8AM - 12PM)' },
  { value: 'afternoon', label: 'ظهراً (12:00 - 4:00)', labelEn: 'Afternoon (12PM - 4PM)' },
  { value: 'evening', label: 'مساءً (4:00 - 8:00)', labelEn: 'Evening (4PM - 8PM)' },
] as const

export default function CheckoutSchedulePage() {
  const router = useRouter()
  const { cart } = useCart()

  const [address, setAddress] = useState<DeliveryAddress | null>(null)
  const [schedule, setSchedule] = useState<DeliverySchedule>({
    date: '',
    time_slot: 'morning',
  })

  // Load address from previous step
  useEffect(() => {
    const storedAddress = localStorage.getItem('checkout_address')
    if (!storedAddress) {
      router.push('/checkout/address')
      return
    }
    setAddress(JSON.parse(storedAddress))

    // Set default date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSchedule((prev) => ({
      ...prev,
      date: tomorrow.toISOString().split('T')[0],
    }))
  }, [router])

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0) {
      router.push('/products')
    }
  }, [cart.items.length, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!schedule.date) {
      alert('الرجاء اختيار تاريخ التوصيل')
      return
    }

    // Store schedule in localStorage
    localStorage.setItem('checkout_schedule', JSON.stringify(schedule))

    // Navigate to review page
    router.push('/checkout/review')
  }

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    return maxDate.toISOString().split('T')[0]
  }

  if (cart.items.length === 0 || !address) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">موعد التوصيل</h1>
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
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">
                  ✓
                </div>
                <span className="text-sm font-medium text-green-600">العنوان</span>
              </div>

              <div className="w-12 h-0.5 bg-primary-600 mx-2" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-primary-600">الموعد</span>
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
            {/* Delivery Address Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">عنوان التوصيل</h3>
              <p className="text-sm text-gray-700">{address.address}</p>
              {address.district && (
                <p className="text-sm text-gray-600 mt-1">
                  {address.district}
                  {address.city && `, ${address.city}`}
                </p>
              )}
              <Link
                href="/checkout/address"
                className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
              >
                تعديل العنوان ←
              </Link>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ التوصيل <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={schedule.date}
                onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
                min={getMinDate()}
                max={getMaxDate()}
                required
                dir="ltr"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                التوصيل متاح ابتداءً من الغد حتى 30 يوماً
              </p>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الفترة الزمنية <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {TIME_SLOTS.map((slot) => (
                  <label
                    key={slot.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      schedule.time_slot === slot.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-primary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="time_slot"
                      value={slot.value}
                      checked={schedule.time_slot === slot.value}
                      onChange={(e) =>
                        setSchedule({
                          ...schedule,
                          time_slot: e.target.value as DeliverySchedule['time_slot'],
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="mr-3">
                      <p className="text-sm font-medium text-gray-900">{slot.label}</p>
                      <p className="text-xs text-gray-500">{slot.labelEn}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">ملاحظة هامة:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>المورد سيقوم بتفريغ المواد في الموقع المحدد</li>
                    <li>يُرجى التأكد من توفر مساحة كافية للتفريغ</li>
                    <li>سيتصل بك السائق قبل الوصول بـ 30 دقيقة</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Link href="/checkout/address" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  السابق
                </Button>
              </Link>
              <Button type="submit" variant="primary" className="flex-1">
                التالي: مراجعة الطلب
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
