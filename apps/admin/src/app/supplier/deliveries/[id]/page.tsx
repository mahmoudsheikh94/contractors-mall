import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeliveryConfirmation } from './DeliveryConfirmation'
import { PageHeader } from '@/components/layout/PageHeader'
import Link from 'next/link'

async function getDeliveryDetails(deliveryId: string) {
  const supabase = await createClient()

  const { data: delivery, error } = await (supabase as any)
    .from('deliveries')
    .select(`
      *,
      order:orders!inner(
        id,
        order_number,
        total_jod,
        status,
        contractor_id,
        supplier_id,
        delivery_notes
      )
    `)
    .eq('delivery_id', deliveryId)
    .single()

  if (error) {
    console.error('Error fetching delivery:', error)
    return null
  }

  return delivery
}

export default async function DeliveryDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const delivery = await getDeliveryDetails(params.id)

  if (!delivery) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          التوصيل غير موجود
        </h2>
        <p className="text-gray-600 mb-6">
          لم نتمكن من العثور على بيانات التوصيل المطلوبة
        </p>
        <Link
          href="/supplier/deliveries"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للتوصيلات
        </Link>
      </div>
    )
  }

  const order = delivery.order
  const isCompleted = !!delivery.completed_at
  const requiresPin = order.total_jod >= 120
  const isPinVerified = !!delivery.pin_verified_at
  const isPhotoUploaded = !!delivery.photo_uploaded_at

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="تفاصيل التوصيل"
        subtitle={`طلب #${order.order_number}`}
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/supplier/dashboard' },
          { label: 'التوصيل', href: '/supplier/deliveries' },
          { label: `توصيل #${delivery.delivery_id.slice(0, 8)}...` },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Delivery Status Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              حالة التوصيل
            </h2>

            {isCompleted ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">✅</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-1">
                      تم التوصيل بنجاح
                    </h3>
                    <p className="text-green-800 mb-2">
                      {new Date(delivery.completed_at).toLocaleString('ar-JO')}
                    </p>
                    {isPinVerified && (
                      <p className="text-sm text-green-700">
                        ✓ تم التحقق بواسطة رمز PIN
                      </p>
                    )}
                    {isPhotoUploaded && (
                      <p className="text-sm text-green-700">
                        ✓ تم رفع صورة التأكيد
                      </p>
                    )}
                  </div>
                </div>

                {/* Show Photo if uploaded */}
                {isPhotoUploaded && delivery.photo_url && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      صورة التأكيد:
                    </p>
                    <img
                      src={delivery.photo_url}
                      alt="صورة التأكيد"
                      className="rounded-lg max-w-md"
                    />
                  </div>
                )}
              </div>
            ) : (
              <DeliveryConfirmation
                deliveryId={delivery.delivery_id}
                orderTotal={order.total_jod}
                requiresPin={requiresPin}
                pinAttempts={delivery.pin_attempts}
              />
            )}
          </div>
        </div>

        {/* Sidebar - Order Details */}
        <div className="lg:col-span-1">
          {/* Order Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              معلومات الطلب
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">رقم الطلب:</span>
                <span className="font-semibold">#{order.order_number}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">المبلغ الإجمالي:</span>
                <span className="font-semibold">{order.total_jod.toFixed(2)} د.أ</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">حالة الطلب:</span>
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>

          {/* Delivery Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              معلومات التوصيل
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600 block mb-1">التاريخ:</span>
                <span className="font-semibold">
                  {new Date(delivery.scheduled_date).toLocaleDateString('ar-JO')}
                </span>
              </div>

              <div>
                <span className="text-gray-600 block mb-1">الوقت:</span>
                <span className="font-semibold">
                  {getTimeSlotLabel(delivery.scheduled_time_slot)}
                </span>
              </div>

              <div>
                <span className="text-gray-600 block mb-1">العنوان:</span>
                <span className="font-semibold">
                  {delivery.address_line}, {delivery.neighborhood}, {delivery.city}
                </span>
              </div>

              {delivery.building_number && (
                <div>
                  <span className="text-gray-600 block mb-1">المبنى / الطابق:</span>
                  <span className="font-semibold">
                    مبنى {delivery.building_number}
                    {delivery.floor_number && ` - طابق ${delivery.floor_number}`}
                    {delivery.apartment_number && ` - شقة ${delivery.apartment_number}`}
                  </span>
                </div>
              )}

              <div>
                <span className="text-gray-600 block mb-1">رقم الهاتف:</span>
                <span className="font-semibold">{delivery.phone}</span>
              </div>

              {delivery.notes && (
                <div>
                  <span className="text-gray-600 block mb-1">ملاحظات:</span>
                  <span className="font-semibold">{delivery.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Driver Info Card (if assigned) */}
          {delivery.driver_name && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                معلومات السائق
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600 block mb-1">الاسم:</span>
                  <span className="font-semibold">{delivery.driver_name}</span>
                </div>

                {delivery.driver_phone && (
                  <div>
                    <span className="text-gray-600 block mb-1">الهاتف:</span>
                    <span className="font-semibold">{delivery.driver_phone}</span>
                  </div>
                )}

                {delivery.vehicle_plate_number && (
                  <div>
                    <span className="text-gray-600 block mb-1">رقم اللوحة:</span>
                    <span className="font-semibold">{delivery.vehicle_plate_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'تم تأكيد الطلب', className: 'bg-blue-100 text-blue-800' },
    in_delivery: { label: 'قيد التوصيل', className: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'تم التوصيل', className: 'bg-indigo-100 text-indigo-800' },
    completed: { label: 'مكتمل', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800' },
    disputed: { label: 'متنازع عليه', className: 'bg-yellow-100 text-yellow-800' },
    cancelled: { label: 'ملغي', className: 'bg-gray-100 text-gray-800' },
    awaiting_contractor_confirmation: { label: 'في انتظار التأكيد', className: 'bg-blue-100 text-blue-800' },
  }

  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
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
