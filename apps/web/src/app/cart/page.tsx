'use client'

/**
 * Cart Page
 * ==========
 * Standalone full-page cart view with:
 * - Item list with quantities and prices
 * - Vehicle estimation display
 * - Delivery fee calculation
 * - Proceed to checkout button
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@contractors-mall/ui'

export default function CartPage() {
  const { cart, totals, updateQuantity, removeItem } = useCart()
  const [vehicleEstimate, setVehicleEstimate] = useState<any>(null)
  const [loadingEstimate, setLoadingEstimate] = useState(false)

  // Fetch vehicle estimate when cart changes
  useEffect(() => {
    if (cart.items.length === 0) {
      setVehicleEstimate(null)
      return
    }

    const fetchVehicleEstimate = async () => {
      setLoadingEstimate(true)
      try {
        const response = await fetch('/api/vehicle-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
            })),
          }),
        })

        const data = await response.json()
        if (data.vehicle) {
          setVehicleEstimate(data)
        }
      } catch (error) {
        console.error('Error fetching vehicle estimate:', error)
      } finally {
        setLoadingEstimate(false)
      }
    }

    fetchVehicleEstimate()
  }, [cart.items])

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">سلة المشتريات</h1>
              <Link href="/products">
                <Button variant="outline" size="sm">
                  العودة للمنتجات
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Empty State */}
        <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h3 className="mt-6 text-lg font-medium text-gray-900">
              سلة المشتريات فارغة
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              لم تقم بإضافة أي منتجات إلى سلة المشتريات بعد
            </p>
            <div className="mt-6">
              <Link href="/products">
                <Button variant="primary" size="lg">
                  تصفح المنتجات
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              سلة المشتريات ({totals.itemCount} {totals.itemCount === 1 ? 'منتج' : 'منتجات'})
            </h1>
            <Link href="/products">
              <Button variant="outline" size="sm">
                متابعة التسوق
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  المنتجات ({cart.items.length})
                </h2>

                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      {/* Product Image Placeholder */}
                      <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900">
                          {item.name_ar}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.name_en}
                        </p>

                        {/* Specifications */}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                          {item.weight_kg_per_unit && (
                            <span>الوزن: {item.weight_kg_per_unit} كغ</span>
                          )}
                          {item.volume_m3_per_unit && (
                            <span>الحجم: {item.volume_m3_per_unit} م³</span>
                          )}
                          {item.length_m_per_unit && (
                            <span>الطول: {item.length_m_per_unit} م</span>
                          )}
                        </div>

                        {/* Price and Quantity */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              <span className="text-lg">-</span>
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 text-center border border-gray-300 rounded-md"
                            />
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              <span className="text-lg">+</span>
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {item.price_per_unit.toFixed(2)} د.أ × {item.quantity}
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {(item.price_per_unit * item.quantity).toFixed(2)} د.أ
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex-shrink-0 text-red-600 hover:text-red-700"
                        aria-label="حذف المنتج"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-8 lg:mt-0 lg:col-span-5">
            <div className="bg-white rounded-lg shadow-sm sticky top-4">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  ملخص الطلب
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">المجموع الفرعي</span>
                    <span className="font-medium">{totals.subtotal.toFixed(2)} د.أ</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">عدد المنتجات</span>
                    <span className="font-medium">{totals.itemCount}</span>
                  </div>

                  {totals.totalWeight > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الوزن الإجمالي</span>
                      <span className="font-medium">{totals.totalWeight.toFixed(2)} كغ</span>
                    </div>
                  )}

                  {totals.totalVolume > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الحجم الإجمالي</span>
                      <span className="font-medium">{totals.totalVolume.toFixed(2)} م³</span>
                    </div>
                  )}
                </div>

                {/* Vehicle Estimate */}
                {loadingEstimate ? (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">جاري حساب رسوم التوصيل...</p>
                  </div>
                ) : vehicleEstimate?.vehicle ? (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">
                      🚚 المركبة المقترحة
                    </h3>
                    <p className="text-base font-semibold text-blue-900">
                      {vehicleEstimate.vehicle.name_ar}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {vehicleEstimate.vehicle.description_ar}
                    </p>
                  </div>
                ) : null}

                {/* Delivery Fee Note */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 سيتم حساب رسوم التوصيل حسب المنطقة في الخطوة التالية
                  </p>
                </div>

                {/* Total */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">الإجمالي</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {totals.subtotal.toFixed(2)} د.أ
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    رسوم التوصيل سيتم إضافتها في صفحة الدفع
                  </p>
                </div>

                {/* Checkout Button */}
                <div className="mt-6">
                  <Link href="/checkout/address">
                    <Button variant="primary" className="w-full" size="lg">
                      متابعة إلى الدفع
                    </Button>
                  </Link>
                </div>

                {/* Continue Shopping */}
                <div className="mt-4">
                  <Link href="/products">
                    <Button variant="outline" className="w-full">
                      متابعة التسوق
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
