import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OrderActions } from './OrderActions'
import { OrderTimeline as OrderActivityTimeline } from '@/components/supplier/orders/OrderTimeline'
import { OrderNotes } from '@/components/supplier/orders/OrderNotes'
import { OrderDetailsEditor } from '@/components/supplier/orders/OrderDetailsEditor'
import { OrderTags } from '@/components/supplier/orders/OrderTags'
import { OrderChat } from '@/components/supplier/orders/OrderChat'

interface OrderDetailsPageProps {
  params: Promise<{
    order_id: string
  }>
}

async function getOrderDetails(orderId: string, supplierId: string) {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      contractor:contractor_id (
        id,
        full_name,
        phone,
        email
      ),
      order_items (
        item_id,
        product_id,
        product_name,
        quantity,
        unit_price_jod,
        total_jod,
        product:product_id (
          name_ar,
          name_en,
          unit
        )
      )
    `)
    .eq('id', orderId)
    .eq('supplier_id', supplierId)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return null
  }

  return order
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const supabase = await createClient()
  const { order_id } = await params

  // Get current user and supplier info
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('supplier_id: id, business_name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          خطأ: لم يتم العثور على حساب المورد
        </h2>
        <p className="text-gray-600 mb-6">
          لم نتمكن من العثور على بيانات المورد المرتبطة بحسابك
        </p>
        <a
          href="/auth/register"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          التسجيل كمورد
        </a>
      </div>
    )
  }

  const order = await getOrderDetails(order_id, supplier.supplier_id)

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">الطلب غير موجود</h2>
        <Link href="/supplier/orders" className="text-primary-600 hover:text-primary-700">
          العودة إلى الطلبات
        </Link>
      </div>
    )
  }

  const subtotal = order.order_items?.reduce((sum: number, item: any) => sum + item.total_jod, 0) || 0

  return (
    <div>
      {/* Header with Back Link */}
      <div className="mb-6">
        <Link
          href="/supplier/orders"
          className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-2"
        >
          ← العودة إلى الطلبات
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              طلب #{order.order_number}
            </h1>
            <p className="text-gray-600 mt-2">
              تاريخ الطلب: {new Date(order.created_at).toLocaleString('ar-JO')}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Order Tags */}
        <div className="mt-4">
          <OrderTags orderId={order.order_id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Buttons (for confirmed status) */}
          {order.status === 'confirmed' && (
            <div id="actions" className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                إجراء مطلوب: قبول أو رفض الطلب
              </h3>
              <p className="text-yellow-700 mb-4">
                يرجى مراجعة تفاصيل الطلب واتخاذ القرار المناسب
              </p>
              <OrderActions orderId={order.order_id} orderNumber={order.order_number} />
            </div>
          )}

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">المنتجات المطلوبة</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.item_id} className="flex justify-between items-center pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.product?.name_ar || item.product_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        الكمية: {item.quantity} {item.product?.unit || 'وحدة'}
                      </p>
                      <p className="text-sm text-gray-600">
                        السعر: {item.unit_price_jod.toFixed(2)} د.أ / {item.product?.unit || 'وحدة'}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {item.total_jod.toFixed(2)} د.أ
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} د.أ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">رسوم التوصيل:</span>
                  <span className="font-medium">{order.delivery_fee_jod.toFixed(2)} د.أ</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>المجموع الكلي:</span>
                  <span className="text-primary-600">{order.total_jod.toFixed(2)} د.أ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">معلومات التوصيل</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">التاريخ والوقت</h3>
                <p className="text-gray-900">
                  {new Date(order.delivery_date).toLocaleDateString('ar-JO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {getTimeSlotLabel(order.delivery_time_slot)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">العنوان</h3>
                <p className="text-gray-900 whitespace-pre-line">{order.delivery_address}</p>
              </div>

              {order.delivery_notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">ملاحظات التوصيل</h3>
                  <p className="text-gray-900">{order.delivery_notes}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">نوع المركبة</h3>
                <p className="text-gray-900">{getVehicleLabel(order.vehicle_type)}</p>
              </div>
            </div>
          </div>

          {/* Enhanced Order Details */}
          <OrderDetailsEditor
            orderId={order.order_id}
            initialValues={{
              delivery_instructions: order.delivery_instructions,
              special_requests: order.special_requests,
              internal_reference: order.internal_reference,
            }}
          />

          {/* Rejection Reason (if rejected) */}
          {order.status === 'rejected' && order.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">سبب الرفض</h3>
              <p className="text-red-800">{order.rejection_reason}</p>
            </div>
          )}

          {/* Order Notes */}
          <OrderNotes orderId={order.order_id} currentUserId={user.id} />

          {/* Order Chat */}
          <OrderChat orderId={order.order_id} currentUserId={user.id} currentUserType="supplier" />

          {/* Activity Timeline */}
          <OrderActivityTimeline orderId={order.order_id} />
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">معلومات العميل</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">الاسم</h3>
                <p className="text-gray-900">{order.contractor?.full_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">الهاتف</h3>
                <a
                  href={`tel:${order.contractor?.phone}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                  dir="ltr"
                >
                  {order.contractor?.phone}
                </a>
              </div>
              {order.contractor?.email && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">البريد الإلكتروني</h3>
                  <a
                    href={`mailto:${order.contractor?.email}`}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    {order.contractor?.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">مراحل الطلب</h2>
            </div>
            <div className="p-6">
              <OrderTimeline order={order} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'جديد - معلق', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
    accepted: { label: 'مقبول', className: 'bg-green-100 text-green-800 border border-green-200' },
    in_delivery: { label: 'قيد التوصيل', className: 'bg-purple-100 text-purple-800 border border-purple-200' },
    delivered: { label: 'تم التوصيل', className: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
    completed: { label: 'مكتمل', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800 border border-red-200' },
    disputed: { label: 'متنازع عليه', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  }

  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-4 py-2 text-sm font-bold rounded-lg ${config.className}`}>
      {config.label}
    </span>
  )
}

function OrderTimeline({ order }: { order: any }) {
  const events = []

  // Order placed
  events.push({
    label: 'تم استلام الطلب',
    date: order.created_at,
    completed: true,
  })

  // Accepted/Rejected
  if (order.status === 'rejected') {
    events.push({
      label: 'تم رفض الطلب',
      date: order.updated_at,
      completed: true,
      highlight: 'red',
    })
  } else if (['accepted', 'in_delivery', 'delivered', 'completed'].includes(order.status)) {
    events.push({
      label: 'تم قبول الطلب',
      date: order.updated_at,
      completed: true,
    })
  }

  // In delivery
  if (['in_delivery', 'delivered', 'completed'].includes(order.status)) {
    events.push({
      label: 'خرج للتوصيل',
      date: order.updated_at,
      completed: true,
    })
  }

  // Delivered
  if (['delivered', 'completed'].includes(order.status)) {
    events.push({
      label: 'تم التوصيل',
      date: order.updated_at,
      completed: true,
    })
  }

  // Completed
  if (order.status === 'completed') {
    events.push({
      label: 'اكتمل الطلب',
      date: order.updated_at,
      completed: true,
      highlight: 'green',
    })
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`
                w-3 h-3 rounded-full
                ${event.completed
                  ? event.highlight === 'red'
                    ? 'bg-red-500'
                    : event.highlight === 'green'
                    ? 'bg-green-500'
                    : 'bg-primary-500'
                  : 'bg-gray-300'}
              `}
            />
            {index < events.length - 1 && (
              <div className="w-0.5 h-8 bg-gray-300" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className={`font-medium ${event.completed ? 'text-gray-900' : 'text-gray-500'}`}>
              {event.label}
            </p>
            {event.date && (
              <p className="text-xs text-gray-500 mt-1">
                {new Date(event.date).toLocaleString('ar-JO', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function getTimeSlotLabel(slot: string) {
  const slots: Record<string, string> = {
    morning: 'صباحاً (8:00 - 12:00)',
    afternoon: 'ظهراً (12:00 - 4:00)',
    evening: 'مساءً (4:00 - 8:00)',
  }
  return slots[slot] || slot
}

function getVehicleLabel(type: string) {
  const types: Record<string, string> = {
    pickup_1ton: 'وانيت 1 طن',
    truck_3_5ton: 'شاحنة 3.5 طن',
    flatbed_5ton: 'قلاب مسطح 5 طن',
  }
  return types[type] || type
}
