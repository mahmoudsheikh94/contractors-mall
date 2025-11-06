'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { Button } from '@contractors-mall/ui'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import EmailVerificationWarning from '@/components/EmailVerificationWarning'
import type { DeliveryAddress, DeliverySchedule } from '@/types/checkout'
import type { VehicleEstimate } from '@/types/vehicle'
import { groupCartItemsBySupplier, cartItemsToEstimateItems } from '@/lib/utils/vehicleEstimate'

interface SupplierOrder {
  supplierId: string
  supplierName: string
  supplierNameEn: string
  items: any[]
  subtotal: number
  vehicleEstimate: VehicleEstimate | null
  estimateLoading: boolean
  estimateError: string | null
}

export default function CheckoutReviewPage() {
  const router = useRouter()
  const { cart, clearCart } = useCart()

  const [address, setAddress] = useState<DeliveryAddress | null>(null)
  const [schedule, setSchedule] = useState<DeliverySchedule | null>(null)
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([])
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [emailVerified, setEmailVerified] = useState<boolean>(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Check email verification status
  useEffect(() => {
    const checkEmailVerification = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || null)

        const { data: profile } = await supabase
          .from('profiles')
          .select('email_verified')
          .eq('id', user.id)
          .single()

        setEmailVerified(profile?.email_verified || false)
      }
    }

    checkEmailVerification()
  }, [])

  // Load checkout data from previous steps
  useEffect(() => {
    const storedAddress = localStorage.getItem('checkout_address')
    const storedSchedule = localStorage.getItem('checkout_schedule')

    if (!storedAddress || !storedSchedule) {
      router.push('/checkout/address')
      return
    }

    setAddress(JSON.parse(storedAddress))
    setSchedule(JSON.parse(storedSchedule))
  }, [router])

  // Group cart items by supplier and fetch vehicle estimates
  useEffect(() => {
    if (!address || cart.items.length === 0) return

    const groups = groupCartItemsBySupplier(cart.items)
    const orders: SupplierOrder[] = Object.values(groups).map((group) => ({
      ...group,
      subtotal: group.items.reduce(
        (sum, item) => sum + item.price_per_unit * item.quantity,
        0
      ),
      vehicleEstimate: null,
      estimateLoading: true,
      estimateError: null,
    }))

    setSupplierOrders(orders)

    // Fetch vehicle estimates for each supplier
    orders.forEach((order, index) => {
      const estimateItems = cartItemsToEstimateItems(order.items)

      fetch('/api/vehicle-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: order.supplierId,
          deliveryLat: address.latitude,
          deliveryLng: address.longitude,
          items: estimateItems,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.estimate) {
            setSupplierOrders((prev) =>
              prev.map((o, i) =>
                i === index
                  ? { ...o, vehicleEstimate: data.estimate, estimateLoading: false }
                  : o
              )
            )
          } else if (data.error) {
            setSupplierOrders((prev) =>
              prev.map((o, i) =>
                i === index
                  ? {
                      ...o,
                      estimateLoading: false,
                      estimateError: data.error || 'فشل تقدير رسوم التوصيل',
                    }
                  : o
              )
            )
          }
        })
        .catch((error) => {
          console.error('Vehicle estimate error:', error)
          setSupplierOrders((prev) =>
            prev.map((o, i) =>
              i === index
                ? { ...o, estimateLoading: false, estimateError: 'خطأ في الاتصال بالخادم' }
                : o
            )
          )
        })
    })
  }, [address, cart.items])

  const getTotalAmount = () => {
    return supplierOrders.reduce(
      (sum, order) =>
        sum + order.subtotal + (order.vehicleEstimate?.delivery_fee_jod || 0),
      0
    )
  }

  const getTotalDeliveryFees = () => {
    return supplierOrders.reduce(
      (sum, order) => sum + (order.vehicleEstimate?.delivery_fee_jod || 0),
      0
    )
  }

  const canPlaceOrder = () => {
    return (
      supplierOrders.length > 0 &&
      supplierOrders.every((o) => o.vehicleEstimate && !o.estimateLoading && !o.estimateError)
    )
  }

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder() || !address || !schedule) return

    // Client-side check for email verification
    if (!emailVerified) {
      alert('يرجى تأكيد بريدك الإلكتروني قبل إتمام الطلب\n\nPlease verify your email address before placing an order')
      return
    }

    setIsPlacingOrder(true)

    try {
      const createdOrders = []

      // Create an order for each supplier
      for (const supplierOrder of supplierOrders) {
        if (!supplierOrder.vehicleEstimate) continue

        const orderRequest = {
          supplierId: supplierOrder.supplierId,
          items: supplierOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price_per_unit,
          })),
          deliveryAddress: {
            latitude: address.latitude,
            longitude: address.longitude,
            address: address.address,
            phone: address.phone,
          },
          deliverySchedule: {
            date: schedule.date,
            time_slot: schedule.time_slot,
          },
          vehicleEstimate: {
            vehicle_class_id: supplierOrder.vehicleEstimate.vehicle_class_id,
            delivery_fee_jod: supplierOrder.vehicleEstimate.delivery_fee_jod,
            delivery_zone: supplierOrder.vehicleEstimate.zone,
          },
        }

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderRequest),
        })

        const data = await response.json()

        if (!response.ok) {
          // Check for email verification error specifically
          if (data.error_code === 'EMAIL_NOT_VERIFIED') {
            throw new Error(data.error || 'يرجى تأكيد بريدك الإلكتروني قبل إتمام الطلب')
          }
          throw new Error(data.error || 'Failed to create order')
        }

        createdOrders.push(data)
      }

      // Clear cart
      clearCart()

      // Clear checkout data
      localStorage.removeItem('checkout_address')
      localStorage.removeItem('checkout_schedule')

      // Show success message
      alert(
        `تم إنشاء ${createdOrders.length} طلب بنجاح! تم حجز المبلغ وسيتم تحويله للموردين بعد التوصيل.\n\n${createdOrders.length} order(s) created successfully! Payment has been held in escrow and will be released to suppliers after delivery.`
      )

      // Navigate to orders page (will be created later)
      router.push('/products')
    } catch (error) {
      console.error('Order creation error:', error)
      alert(`حدث خطأ أثناء إنشاء الطلب:\n${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (!address || !schedule || cart.items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">مراجعة الطلب</h1>
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

              <div className="w-12 h-0.5 bg-green-600 mx-2" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">
                  ✓
                </div>
                <span className="text-sm font-medium text-green-600">الموعد</span>
              </div>

              <div className="w-12 h-0.5 bg-primary-600 mx-2" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm font-medium text-primary-600">المراجعة</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Email Verification Warning */}
          {!emailVerified && (
            <EmailVerificationWarning email={userEmail} />
          )}

          {/* Delivery Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">معلومات التوصيل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">العنوان</p>
                <p className="text-sm text-gray-900">{address.address}</p>
                {address.district && (
                  <p className="text-sm text-gray-600">
                    {address.district}
                    {address.city && `, ${address.city}`}
                  </p>
                )}
                <Link
                  href="/checkout/address"
                  className="text-sm text-primary-600 hover:text-primary-700 mt-1 inline-block"
                >
                  تعديل ←
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">موعد التوصيل</p>
                <p className="text-sm text-gray-900">{schedule.date}</p>
                <p className="text-sm text-gray-600">
                  {schedule.time_slot === 'morning' && 'صباحاً (8:00 - 12:00)'}
                  {schedule.time_slot === 'afternoon' && 'ظهراً (12:00 - 4:00)'}
                  {schedule.time_slot === 'evening' && 'مساءً (4:00 - 8:00)'}
                </p>
                <Link
                  href="/checkout/schedule"
                  className="text-sm text-primary-600 hover:text-primary-700 mt-1 inline-block"
                >
                  تعديل ←
                </Link>
              </div>
            </div>
          </div>

          {/* Supplier Orders */}
          <div className="space-y-4">
            {supplierOrders.map((order, index) => (
              <div key={order.supplierId} className="bg-white rounded-lg shadow-sm p-6">
                {/* Supplier Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900">{order.supplierName}</h3>
                  </div>
                  <span className="text-sm text-gray-500">طلب #{index + 1}</span>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{item.name_ar}</p>
                        <p className="text-gray-600">
                          {item.quantity} {item.unit_ar} × {item.price_per_unit.toFixed(2)} د.أ
                        </p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {(item.quantity * item.price_per_unit).toFixed(2)} د.أ
                      </p>
                    </div>
                  ))}
                </div>

                {/* Vehicle Estimate */}
                {order.estimateLoading && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
                    <p className="mt-2 text-sm text-gray-600">جاري حساب رسوم التوصيل...</p>
                  </div>
                )}

                {order.estimateError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{order.estimateError}</p>
                  </div>
                )}

                {order.vehicleEstimate && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="h-5 w-5 text-gray-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {order.vehicleEstimate.vehicle_name_ar}
                        </p>
                        <p className="text-xs text-gray-600">
                          المسافة: {order.vehicleEstimate.distance_km.toFixed(1)} كم •{' '}
                          {order.vehicleEstimate.zone === 'zone_a'
                            ? 'منطقة أ'
                            : 'منطقة ب'}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {order.vehicleEstimate.delivery_fee_jod.toFixed(2)} د.أ
                        </p>
                        <p className="text-xs text-gray-600">رسوم التوصيل</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtotal */}
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="text-sm font-medium text-gray-700">المجموع الفرعي:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {order.subtotal.toFixed(2)} د.أ
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-sm text-gray-600">رسوم التوصيل:</span>
                  <span className="text-sm text-gray-900">
                    {order.vehicleEstimate?.delivery_fee_jod.toFixed(2) || '-'} د.أ
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between">
                  <span className="font-medium text-gray-900">إجمالي هذا الطلب:</span>
                  <span className="font-medium text-primary-600">
                    {(
                      order.subtotal + (order.vehicleEstimate?.delivery_fee_jod || 0)
                    ).toFixed(2)}{' '}
                    د.أ
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">الملخص النهائي</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">عدد الطلبات:</span>
                <span className="font-medium">{supplierOrders.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-medium">
                  {supplierOrders
                    .reduce((sum, o) => sum + o.subtotal, 0)
                    .toFixed(2)}{' '}
                  د.أ
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">إجمالي رسوم التوصيل:</span>
                <span className="font-medium">{getTotalDeliveryFees().toFixed(2)} د.أ</span>
              </div>
              <div className="pt-3 border-t flex justify-between">
                <span className="text-lg font-medium text-gray-900">المبلغ الإجمالي:</span>
                <span className="text-lg font-bold text-primary-600">
                  {getTotalAmount().toFixed(2)} د.أ
                </span>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Link href="/checkout/schedule" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                السابق
              </Button>
            </Link>
            <Button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder() || isPlacingOrder}
              variant="primary"
              className="flex-1"
            >
              {isPlacingOrder ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب والدفع'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
