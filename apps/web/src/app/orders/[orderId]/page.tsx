'use client'

/**
 * Order Details Page
 *
 * Displays comprehensive order information including:
 * - Order status timeline
 * - Delivery details and PIN (if applicable)
 * - Order items breakdown
 * - Payment information
 * - Supplier contact
 * - Actions (contact supplier, report issue)
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { OrderChat } from '@/components/OrderChat'

interface OrderDetailsPageProps {
  params: { orderId: string }
}

type OrderStatus = 'pending' | 'confirmed' | 'in_delivery' | 'awaiting_contractor_confirmation' | 'delivered' | 'completed' | 'rejected' | 'disputed' | 'cancelled'

interface OrderItem {
  item_id: string
  quantity: number
  unit_price_jod: number
  total_jod: number
  product: {
    name_ar: string
    name_en: string
    unit_ar: string
  }
}

interface OrderDetails {
  order_id: string
  order_number: string
  status: OrderStatus
  total_jod: number
  scheduled_delivery_date: string
  scheduled_delivery_time: string
  delivery_fee_jod: number
  created_at: string
  supplier: {
    id: string
    business_name: string
    business_name_en: string
    phone: string
    email: string | null
  }
  delivery: {
    delivery_pin: string | null
    address_line: string
    neighborhood: string
    city: string
    building_number: string | null
    floor_number: string | null
    apartment_number: string | null
    phone: string
  } | null
  payment: {
    status: string
    amount_jod: number
    payment_intent_id: string | null
  } | null
  order_items: OrderItem[]
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Extract fetch logic so it can be called manually for refetching
  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }

      const { data, error: fetchError } = (await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_jod,
          scheduled_delivery_date,
          scheduled_delivery_time,
          delivery_fee_jod,
          created_at,
          suppliers (
            id,
            business_name,
            business_name_en,
            phone,
            email
          ),
          deliveries (
            delivery_pin,
            address_line,
            neighborhood,
            city,
            building_number,
            floor_number,
            apartment_number,
            phone
          ),
          payments (
            status,
            amount_jod,
            payment_intent_id
          ),
          order_items (
            item_id,
            quantity,
            unit_price_jod,
            total_jod,
            products (
              name_ar,
              name_en,
              unit_ar
            )
          )
        `)
        .eq('id', params.orderId)
        .single()) as { data: any | null, error: any }

      if (fetchError) throw fetchError

      // Transform the data
      const orderDetails: OrderDetails = {
        order_id: data.id,
        order_number: data.order_number,
        status: data.status,
        total_jod: data.total_jod,
        scheduled_delivery_date: data.scheduled_delivery_date,
        scheduled_delivery_time: data.scheduled_delivery_time,
        delivery_fee_jod: data.delivery_fee_jod,
        created_at: data.created_at,
        supplier: {
          id: (data.suppliers as any).id,
          business_name: (data.suppliers as any).business_name,
          business_name_en: (data.suppliers as any).business_name_en,
          phone: (data.suppliers as any).phone,
          email: (data.suppliers as any).email,
        },
        delivery: data.deliveries ? {
          delivery_pin: (data.deliveries as any).delivery_pin,
          address_line: (data.deliveries as any).address_line,
          neighborhood: (data.deliveries as any).neighborhood,
          city: (data.deliveries as any).city,
          building_number: (data.deliveries as any).building_number,
          floor_number: (data.deliveries as any).floor_number,
          apartment_number: (data.deliveries as any).apartment_number,
          phone: (data.deliveries as any).phone,
        } : null,
        payment: data.payments ? {
          status: (data.payments as any).status,
          amount_jod: (data.payments as any).amount_jod,
          payment_intent_id: (data.payments as any).payment_intent_id,
        } : null,
        order_items: (data.order_items as any[]).map((item: any) => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price_jod: item.unit_price_jod,
          total_jod: item.total_jod,
          product: {
            name_ar: item.products.name_ar,
            name_en: item.products.name_en,
            unit_ar: item.products.unit_ar,
          },
        })),
      }

      setOrder(orderDetails)
      setError(null)
    } catch (err) {
      console.error('Error fetching order details:', err)
      setError('فشل تحميل تفاصيل الطلب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetails()
  }, [params.orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">خطأ</h2>
          <p className="text-gray-600 mb-4">{error || 'لم يتم العثور على الطلب'}</p>
          <Link
            href="/orders"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            عرض جميع الطلبات
          </Link>
        </div>
      </div>
    )
  }

  const timeSlotDisplay = {
    morning: 'صباحاً (8:00 - 12:00)',
    afternoon: 'ظهراً (12:00 - 4:00)',
    evening: 'مساءً (4:00 - 8:00)',
  }[order.scheduled_delivery_time] || order.scheduled_delivery_time

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const subtotal = order.total_jod - order.delivery_fee_jod

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/orders"
            className="text-primary-600 hover:text-primary-700 mb-2 inline-block"
          >
            ← العودة لجميع الطلبات
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                طلب رقم #{order.order_number}
              </h1>
              <p className="text-gray-600 mt-1">
                تاريخ الطلب: {formatDate(order.created_at)}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Delivery Timeline */}
        {order.status !== 'rejected' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">مراحل الطلب</h2>
            <DeliveryTimeline status={order.status} />
          </div>
        )}

        {/* Delivery Confirmation Banner */}
        {order.status === 'awaiting_contractor_confirmation' && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">📦</span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-orange-900 mb-2">
                  المورد قام بتأكيد التوصيل
                </h3>
                <p className="text-orange-800 mb-4">
                  قام المورد بتأكيد توصيل الطلب إليك. الرجاء تأكيد استلام الطلب بشكل صحيح.
                  إذا كانت هناك أي مشاكل مع الطلب، يمكنك الإبلاغ عنها الآن.
                </p>
              </div>
            </div>

            <DeliveryConfirmationButtons orderId={order.order_id} orderNumber={order.order_number} onSuccess={fetchOrderDetails} />
          </div>
        )}

        {/* Delivery Details */}
        {order.delivery && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل التوصيل</h2>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">التاريخ</span>
                <span className="font-semibold">{formatDate(order.scheduled_delivery_date)}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">الفترة الزمنية</span>
                <span className="font-semibold">{timeSlotDisplay}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">العنوان</span>
                <span className="font-semibold text-left">
                  {order.delivery.address_line}
                  {order.delivery.building_number && `, مبنى ${order.delivery.building_number}`}
                  {order.delivery.floor_number && `, طابق ${order.delivery.floor_number}`}
                  {order.delivery.apartment_number && `, شقة ${order.delivery.apartment_number}`}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">المنطقة</span>
                <span className="font-semibold">{order.delivery.neighborhood}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">المدينة</span>
                <span className="font-semibold">{order.delivery.city}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-600">رقم الهاتف</span>
                <span className="font-semibold" dir="ltr">{order.delivery.phone}</span>
              </div>
            </div>

            {/* Delivery PIN (if applicable) */}
            {order.delivery.delivery_pin && order.status !== 'completed' && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                  <span className="text-2xl ml-2">🔢</span>
                  رمز التحقق (PIN)
                </h3>
                <div className="bg-white rounded-lg p-4 text-center mb-3">
                  <div className="text-4xl font-mono font-bold text-blue-600 tracking-widest">
                    {order.delivery.delivery_pin}
                  </div>
                </div>
                <p className="text-blue-800 text-sm">
                  ⚠️ احتفظ بهذا الرمز سرياً. قم بمشاركته مع السائق عند استلام الطلب فقط.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل الطلب</h2>

          <div className="space-y-3 mb-6">
            {order.order_items.map((item) => (
              <div key={item.item_id} className="flex justify-between py-3 border-b">
                <div>
                  <div className="font-semibold text-gray-900">{item.product.name_ar}</div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} {item.product.unit_ar} × {(item.unit_price_jod ?? 0).toFixed(2)} د.أ
                  </div>
                </div>
                <div className="font-semibold text-gray-900">
                  {(item.total_jod ?? 0).toFixed(2)} د.أ
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-gray-700">
              <span>المجموع الفرعي</span>
              <span>{subtotal.toFixed(2)} د.أ</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>رسوم التوصيل</span>
              <span>{order.delivery_fee_jod.toFixed(2)} د.أ</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
              <span>المجموع الكلي</span>
              <span>{order.total_jod.toFixed(2)} د.أ</span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {order.payment && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات الدفع</h2>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">حالة الدفع</span>
                <span className="font-semibold">
                  <PaymentStatusBadge status={order.payment.status} />
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">المبلغ المدفوع</span>
                <span className="font-semibold">{(order.payment.amount_jod ?? 0).toFixed(2)} د.أ</span>
              </div>

              {order.payment.payment_intent_id && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">رقم المعاملة</span>
                  <span className="font-mono text-sm">{order.payment.payment_intent_id}</span>
                </div>
              )}
            </div>

            {order.payment.status === 'escrow_held' && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  💳 المبلغ محجوز في حساب الضمان. سيتم تحويل المبلغ للمورد تلقائياً بعد تأكيد استلام الطلب.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Invoice Section */}
        {order.status === 'completed' && (
          <InvoiceSection orderId={order.order_id} />
        )}

        {/* Supplier Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات المورد</h2>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">اسم المورد</span>
              <span className="font-semibold">{order.supplier.business_name}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">رقم الهاتف</span>
              <span className="font-semibold" dir="ltr">{order.supplier.phone}</span>
            </div>

            {order.supplier.email && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">البريد الإلكتروني</span>
                <span className="font-semibold" dir="ltr">{order.supplier.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <a
            href={`tel:${order.supplier.phone}`}
            className="flex-1 bg-primary-600 text-white text-center py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            📞 الاتصال بالمورد
          </a>

          {order.status !== 'completed' && order.status !== 'rejected' && order.status !== 'disputed' && (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="flex-1 bg-yellow-600 text-white text-center py-3 px-6 rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
            >
              ⚠️ الإبلاغ عن مشكلة
            </button>
          )}
        </div>

        {/* Order Chat */}
        {userId && (
          <div className="mb-6">
            <OrderChat orderId={order.order_id} currentUserId={userId} />
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">ملاحظات هامة</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-primary-600 ml-2">•</span>
              <span>سيتصل بك السائق قبل الوصول بـ 30 دقيقة</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 ml-2">•</span>
              <span>المورد مسؤول عن تفريغ المواد في الموقع المحدد</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 ml-2">•</span>
              <span>يرجى التأكد من وجود مساحة كافية للتفريغ</span>
            </li>
            {order.delivery?.delivery_pin && (
              <li className="flex items-start">
                <span className="text-primary-600 ml-2">•</span>
                <span>لا تشارك رمز التحقق (PIN) إلا مع السائق عند الاستلام</span>
              </li>
            )}
          </ul>
        </div>

        {/* Dispute Form Modal (placeholder) */}
        {showDisputeForm && (
          <DisputeFormModal
            orderId={order.order_id}
            onClose={() => setShowDisputeForm(false)}
            onSuccess={fetchOrderDetails}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Order Status Badge Component
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const configs = {
    pending: { label: 'قيد الانتظار', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    confirmed: { label: 'تم تأكيد الطلب', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    in_delivery: { label: 'قيد التوصيل', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    awaiting_contractor_confirmation: { label: 'في انتظار التأكيد', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    delivered: { label: 'تم التوصيل', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
    completed: { label: 'مكتمل', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    rejected: { label: 'مرفوض', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    disputed: { label: 'متنازع عليه', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    cancelled: { label: 'ملغي', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  }

  const config = configs[status] || configs.pending

  return (
    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  )
}

/**
 * Payment Status Badge Component
 */
function PaymentStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string }> = {
    pending: { label: 'قيد الانتظار', color: 'text-yellow-600' },
    held: { label: 'محجوز في الضمان', color: 'text-green-600' },
    escrow_held: { label: 'محجوز في الضمان', color: 'text-green-600' },
    released: { label: 'تم التحويل', color: 'text-blue-600' },
    refunded: { label: 'مسترد', color: 'text-gray-600' },
    failed: { label: 'فشل', color: 'text-red-600' },
  }

  const config = configs[status] || { label: status, color: 'text-gray-600' }

  return <span className={config.color}>{config.label}</span>
}

/**
 * Delivery Timeline Component
 */
function DeliveryTimeline({ status }: { status: OrderStatus }) {
  const steps = [
    { key: 'pending', label: 'قيد الانتظار', icon: '⏳' },
    { key: 'confirmed', label: 'تم تأكيد الطلب', icon: '✓' },
    { key: 'in_delivery', label: 'قيد التوصيل (السائق في الطريق)', icon: '🚚' },
    { key: 'awaiting_contractor_confirmation', label: 'في انتظار تأكيدك', icon: '✋' },
    { key: 'delivered', label: 'تم التوصيل', icon: '📦' },
    { key: 'completed', label: 'مكتمل', icon: '✓' },
  ]

  const statusOrder = ['pending', 'confirmed', 'in_delivery', 'awaiting_contractor_confirmation', 'delivered', 'completed']
  const currentIndex = statusOrder.indexOf(status)

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.key} className="flex items-start">
            <div className="flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-primary-600 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step.icon}
              </div>
            </div>
            <div className="mr-4 flex-1">
              <div
                className={`font-semibold ${
                  isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.label}
              </div>
              {isCurrent && (
                <div className="text-sm text-primary-600 mt-1">الحالة الحالية</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Delivery Confirmation Buttons Component
 */
function DeliveryConfirmationButtons({ orderId, orderNumber, onSuccess }: { orderId: string; orderNumber: string; onSuccess: () => void }) {
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)

  const handleConfirmDelivery = async () => {
    const confirmed = window.confirm(
      `هل أنت متأكد من استلام الطلب #${orderNumber} بشكل صحيح وكامل؟\n\nسيتم تحرير الدفعة للمورد بعد التأكيد.`
    )

    if (!confirmed) return

    setConfirmingDelivery(true)

    try {
      const response = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmed: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل تأكيد الاستلام')
      }

      alert(data.message || 'تم تأكيد الاستلام بنجاح!')
      await onSuccess() // Refetch order data to show updated status
    } catch (err) {
      console.error('Error confirming delivery:', err)
      alert(err instanceof Error ? err.message : 'فشل تأكيد الاستلام. الرجاء المحاولة مرة أخرى.')
    } finally {
      setConfirmingDelivery(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleConfirmDelivery}
          disabled={confirmingDelivery}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="text-xl">✅</span>
          {confirmingDelivery ? 'جاري التأكيد...' : 'تأكيد استلام الطلب'}
        </button>

        <button
          onClick={() => setShowIssueForm(true)}
          disabled={confirmingDelivery}
          className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="text-xl">❌</span>
          الإبلاغ عن مشكلة
        </button>
      </div>

      {showIssueForm && (
        <IssueReportModal
          orderId={orderId}
          orderNumber={orderNumber}
          onClose={() => setShowIssueForm(false)}
          onSuccess={onSuccess}
        />
      )}
    </>
  )
}

/**
 * Issue Report Modal Component
 */
function IssueReportModal({
  orderId,
  orderNumber,
  onClose,
  onSuccess,
}: {
  orderId: string
  orderNumber: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [issues, setIssues] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!issues.trim() || issues.trim().length < 10) {
      alert('الرجاء تقديم وصف تفصيلي للمشكلة (10 أحرف على الأقل)')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmed: false,
          issues: issues.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل إرسال البلاغ')
      }

      alert(data.message || 'تم الإبلاغ عن المشكلة بنجاح')
      await onSuccess() // Refetch order data to show updated status
      onClose()
    } catch (err) {
      console.error('Error reporting issue:', err)
      alert(err instanceof Error ? err.message : 'فشل إرسال البلاغ. الرجاء المحاولة مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          الإبلاغ عن مشكلة في الطلب #{orderNumber}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              وصف المشكلة
            </label>
            <textarea
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={5}
              placeholder="الرجاء وصف المشكلة بالتفصيل... (مثال: كمية ناقصة، تلف في المواد، عدم مطابقة المواصفات)"
              required
            />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>
                سيتم إنشاء نزاع وتجميد الدفعة للمورد حتى يتم حل المشكلة.
                سيتواصل معك فريق الدعم قريباً لحل المشكلة.
              </span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              disabled={submitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Invoice Section Component
 */
function InvoiceSection({ orderId }: { orderId: string }) {
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const supabase = createClient()
        // @ts-ignore - invoices table exists in database
        const { data, error } = await supabase
          // @ts-ignore
          .from('invoices')
          .select('id, invoice_number, issue_date, grand_total_jod, pdf_url, status')
          .eq('order_id', orderId)
          .maybeSingle()

        if (error) {
          console.error('Error fetching invoice:', error)
          setError(error.message)
          setLoading(false)
          return
        }

        if (data) {
          console.log('Invoice found:', data)
          setInvoice(data)
        } else {
          console.log('No invoice found for order:', orderId)
        }
      } catch (err) {
        console.error('Error fetching invoice:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [orderId])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Invoice section error:', error)
    return null
  }

  if (!invoice) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-2xl">📄</span>
        الفاتورة الضريبية
      </h2>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">رقم الفاتورة</span>
          <span className="font-semibold">{invoice.invoice_number}</span>
        </div>

        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">تاريخ الإصدار</span>
          <span className="font-semibold">
            {new Date(invoice.issue_date).toLocaleDateString('ar-JO')}
          </span>
        </div>

        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">المبلغ الإجمالي</span>
          <span className="font-semibold text-blue-600">
            {invoice.grand_total_jod.toFixed(2)} د.أ
          </span>
        </div>

        <div className="flex justify-between py-2">
          <span className="text-gray-600">حالة الفاتورة</span>
          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
            {invoice.status === 'issued' ? 'صادرة' :
             invoice.status === 'submitted_to_portal' ? 'مرسلة للبوابة' :
             invoice.status === 'draft' ? 'مسودة' : invoice.status}
          </span>
        </div>
      </div>

      {invoice.pdf_url ? (
        <a
          href={invoice.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold inline-flex items-center justify-center gap-2"
        >
          <span className="text-xl">⬇️</span>
          تحميل الفاتورة PDF
        </a>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800 text-sm">
            ⏳ جاري إنشاء ملف PDF للفاتورة...
          </p>
        </div>
      )}

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          💡 هذه فاتورة ضريبية معتمدة من دائرة ضريبة الدخل والمبيعات الأردنية
        </p>
      </div>
    </div>
  )
}

/**
 * Dispute Form Modal Component (Placeholder)
 */
function DisputeFormModal({ orderId, onClose, onSuccess }: { orderId: string; onClose: () => void; onSuccess: () => void }) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim() || description.trim().length < 10) {
      alert('الرجاء تقديم وصف تفصيلي للمشكلة (10 أحرف على الأقل)')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل إرسال البلاغ')
      }

      alert('تم إرسال البلاغ بنجاح. سيتم تجميد الدفع وسيتواصل معك فريق الدعم قريباً.')

      // Refetch order data to show updated status
      await onSuccess()
      onClose()
    } catch (err) {
      console.error('Error submitting dispute:', err)
      alert(err instanceof Error ? err.message : 'فشل إرسال البلاغ. الرجاء المحاولة مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">الإبلاغ عن مشكلة</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              وصف المشكلة
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={5}
              placeholder="الرجاء وصف المشكلة بالتفصيل..."
              required
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ سيتم تجميد الدفع للمورد حتى يتم حل المشكلة. سيتواصل معك فريق الدعم قريباً.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              disabled={submitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg hover:bg-yellow-700 transition-colors font-semibold disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
