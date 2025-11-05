'use client'

/**
 * Order Success Page
 *
 * Displayed after successful order placement.
 * Shows order confirmation, payment status, and delivery details.
 */

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface OrderSuccessPageProps {
  params: Promise<{ orderId: string }>
}

interface OrderDetails {
  order_id: string
  order_number: string
  supplier: {
    business_name: string
    business_name_en: string
  }
  total_jod: number
  delivery_date: string
  delivery_time_slot: string
  delivery: {
    delivery_pin: string | null
    scheduled_date: string
    scheduled_time_slot: string
  }
  payment: {
    status: string
    amount_jod: number
  }
}

export default function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const supabase = createClient()

        const { data, error: fetchError } = (await supabase
          .from('orders')
          .select(`
            order_id,
            order_number,
            total_jod,
            delivery_date,
            delivery_time_slot,
            suppliers!inner (
              business_name,
              business_name_en
            ),
            deliveries!inner (
              delivery_pin,
              scheduled_date,
              scheduled_time_slot
            ),
            payments!inner (
              status,
              amount_jod
            )
          `)
          .eq('order_id', resolvedParams.orderId)
          .single()) as { data: any | null, error: any }

        if (fetchError) throw fetchError

        // Transform the data to match our interface
        const orderDetails: OrderDetails = {
          order_id: data.order_id,
          order_number: data.order_number,
          total_jod: data.total_jod,
          delivery_date: data.delivery_date,
          delivery_time_slot: data.delivery_time_slot,
          supplier: {
            business_name: (data.suppliers as any).business_name,
            business_name_en: (data.suppliers as any).business_name_en,
          },
          delivery: {
            delivery_pin: (data.deliveries as any).delivery_pin,
            scheduled_date: (data.deliveries as any).scheduled_date,
            scheduled_time_slot: (data.deliveries as any).scheduled_time_slot,
          },
          payment: {
            status: (data.payments as any).status,
            amount_jod: (data.payments as any).amount_jod,
          },
        }

        setOrder(orderDetails)
      } catch (err) {
        console.error('Error fetching order:', err)
        setError('فشل تحميل تفاصيل الطلب')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [resolvedParams.orderId])

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
  }[order.delivery_time_slot] || order.delivery_time_slot

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-6">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            تم إنشاء طلبك بنجاح!
          </h1>
          <p className="text-gray-600">
            رقم الطلب: <span className="font-semibold text-primary-600">{order.order_number}</span>
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل الطلب</h2>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">المورد</span>
              <span className="font-semibold">{order.supplier.business_name}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">المبلغ الإجمالي</span>
              <span className="font-semibold text-lg">{order.total_jod.toFixed(2)} د.أ</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">تاريخ التوصيل</span>
              <span className="font-semibold">{formatDate(order.delivery_date)}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">الفترة الزمنية</span>
              <span className="font-semibold">{timeSlotDisplay}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
            <span className="text-2xl ml-2">💳</span>
            حالة الدفع
          </h3>
          <p className="text-green-800">
            تم حجز المبلغ ({order.payment.amount_jod.toFixed(2)} د.أ) في حساب الضمان.
            <br />
            سيتم تحويل المبلغ للمورد تلقائياً بعد تأكيد استلام الطلب.
          </p>
        </div>

        {/* Delivery PIN (if applicable) */}
        {order.delivery.delivery_pin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
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
              <br />
              سيتم استخدام هذا الرمز لتأكيد الاستلام وتحرير المبلغ للمورد.
            </p>
          </div>
        )}

        {/* No PIN - Photo Proof */}
        {!order.delivery.delivery_pin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center">
              <span className="text-2xl ml-2">📸</span>
              تأكيد الاستلام بالصورة
            </h3>
            <p className="text-yellow-800 text-sm">
              سيقوم السائق بالتقاط صورة للمواد المسلمة عند الوصول.
              <br />
              سيتم تحرير المبلغ للمورد تلقائياً بعد رفع الصورة.
            </p>
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-gray-100 rounded-lg p-6 mb-6">
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
            <li className="flex items-start">
              <span className="text-primary-600 ml-2">•</span>
              <span>يمكنك الإبلاغ عن أي مشكلة من خلال صفحة تفاصيل الطلب</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/orders/${order.order_id}`}
            className="flex-1 bg-primary-600 text-white text-center py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            عرض تفاصيل الطلب
          </Link>
          <Link
            href="/orders"
            className="flex-1 bg-white text-primary-600 border-2 border-primary-600 text-center py-3 px-6 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
          >
            جميع الطلبات
          </Link>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 underline"
          >
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
