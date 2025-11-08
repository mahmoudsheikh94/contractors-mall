import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EditOrderForm } from './EditOrderForm'
import { CancelOrderButton } from './CancelOrderButton'
import { ChangeOrderStatusForm } from './ChangeOrderStatusForm'

async function getOrderDetails(id: string) {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      contractor:profiles!contractor_id(
        id,
        full_name,
        email,
        phone
      ),
      supplier:suppliers!supplier_id(
        id,
        business_name,
        business_name_en,
        phone,
        email,
        address
      ),
      order_items(
        *,
        product:products(id, name_ar, name_en)
      ),
      deliveries(*),
      payments(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return null
  }

  // Get order notes
  const { data: notes } = await supabase
    .from('order_notes')
    .select(`
      *,
      created_by_user:profiles!created_by(full_name)
    `)
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  // Get disputes
  const { data: disputes } = await supabase
    .from('disputes')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  return {
    ...order,
    notes: notes || [],
    disputes: disputes || [],
  }
}

export default async function OrderDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const order = await getOrderDetails(params.id)

  if (!order) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          الطلب غير موجود
        </h2>
        <Link
          href="/admin/orders"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للطلبات
        </Link>
      </div>
    )
  }

  const delivery = order.deliveries?.[0]
  const payment = order.payments?.[0]

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/orders"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للطلبات
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              طلب #{order.order_number}
            </h1>
            <p className="text-gray-600 mt-2">عرض وتعديل تفاصيل الطلب</p>
          </div>

          {/* Status Badge */}
          <div>
            {order.status === 'pending' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 text-lg font-semibold rounded-lg">
                <span>⏳</span>
                <span>معلق</span>
              </span>
            )}
            {order.status === 'confirmed' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 text-lg font-semibold rounded-lg">
                <span>✓</span>
                <span>مؤكد</span>
              </span>
            )}
            {order.status === 'in_delivery' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 text-lg font-semibold rounded-lg">
                <span>🚚</span>
                <span>قيد التوصيل</span>
              </span>
            )}
            {order.status === 'delivered' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-lg font-semibold rounded-lg">
                <span>📦</span>
                <span>تم التوصيل</span>
              </span>
            )}
            {order.status === 'completed' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-lg font-semibold rounded-lg">
                <span>✅</span>
                <span>مكتمل</span>
              </span>
            )}
            {order.status === 'cancelled' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 text-lg font-semibold rounded-lg">
                <span>❌</span>
                <span>ملغي</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="mb-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">إجراءات المسؤول</h3>
        <div className="flex gap-4">
          <ChangeOrderStatusForm orderId={order.id} currentStatus={order.status || 'pending'} />
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <CancelOrderButton orderId={order.id} orderNumber={order.order_number} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">ملخص الطلب</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">رقم الطلب</label>
                <p className="font-semibold text-gray-900">{order.order_number}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">تاريخ الإنشاء</label>
                <p className="font-semibold text-gray-900">
                  {new Date(order.created_at).toLocaleString('ar-JO')}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">المقاول</label>
                <p className="font-semibold text-gray-900">{order.contractor?.full_name}</p>
                <p className="text-sm text-gray-600">{order.contractor?.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">المورد</label>
                <p className="font-semibold text-gray-900">{order.supplier?.business_name}</p>
                <p className="text-sm text-gray-600">{order.supplier?.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">موعد التوصيل المقرر</label>
                <p className="font-semibold text-gray-900">
                  {new Date(order.scheduled_delivery_date).toLocaleDateString('ar-JO')}
                </p>
                {order.delivery_time_slot && (
                  <p className="text-sm text-gray-600">{order.delivery_time_slot}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">نوع المركبة</label>
                <p className="font-semibold text-gray-900">{order.vehicle_type}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">المنتجات</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">المنتج</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">السعر</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">الكمية</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.order_items.map((item: any) => (
                    <tr key={item.item_id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">{item.unit}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{Number(item.unit_price_jod).toFixed(2)} JOD</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{item.quantity}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{Number(item.total_jod).toFixed(2)} JOD</p>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                      المجموع الفرعي:
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {Number(order.subtotal_jod).toFixed(2)} JOD
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                      رسوم التوصيل:
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {Number(order.delivery_fee_jod).toFixed(2)} JOD
                    </td>
                  </tr>
                  <tr className="bg-primary-50">
                    <td colSpan={3} className="px-4 py-4 text-right text-lg font-bold text-gray-900">
                      الإجمالي:
                    </td>
                    <td className="px-4 py-4 text-lg font-bold text-primary-600">
                      {Number(order.total_jod).toFixed(2)} JOD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات التوصيل</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">العنوان</label>
                <p className="font-semibold text-gray-900">{order.delivery_address}</p>
                {order.delivery_building && (
                  <p className="text-sm text-gray-600">بناية: {order.delivery_building}</p>
                )}
                {order.delivery_floor && (
                  <p className="text-sm text-gray-600">طابق: {order.delivery_floor}</p>
                )}
                {order.delivery_apartment && (
                  <p className="text-sm text-gray-600">شقة: {order.delivery_apartment}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">المدينة</label>
                <p className="font-semibold text-gray-900">{order.delivery_city || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">الحي</label>
                <p className="font-semibold text-gray-900">{order.delivery_neighborhood || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">رقم الهاتف</label>
                <p className="font-semibold text-gray-900">{order.delivery_phone || order.contractor?.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">المنطقة</label>
                <p className="font-semibold text-gray-900">
                  {order.delivery_zone === 'A' ? 'منطقة A' : order.delivery_zone === 'B' ? 'منطقة B' : '-'}
                </p>
              </div>

              {order.delivery_instructions && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600 block mb-1">ملاحظات التوصيل</label>
                  <p className="text-gray-900">{order.delivery_instructions}</p>
                </div>
              )}

              {delivery && (
                <>
                  {delivery.driver_name && (
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">السائق</label>
                      <p className="font-semibold text-gray-900">{delivery.driver_name}</p>
                      {delivery.driver_phone && (
                        <p className="text-sm text-gray-600">{delivery.driver_phone}</p>
                      )}
                    </div>
                  )}

                  {delivery.completed_at && (
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">تاريخ الإكمال</label>
                      <p className="font-semibold text-gray-900">
                        {new Date(delivery.completed_at).toLocaleString('ar-JO')}
                      </p>
                    </div>
                  )}

                  {delivery.proof_photo_url && (
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600 block mb-2">صورة إثبات التوصيل</label>
                      <img
                        src={delivery.proof_photo_url}
                        alt="إثبات التوصيل"
                        className="w-64 h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Payment Information */}
          {payment && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات الدفع</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">المبلغ</label>
                  <p className="text-2xl font-bold text-gray-900">{Number(payment.amount_jod).toFixed(2)} JOD</p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">حالة الدفع</label>
                  <p className="font-semibold text-gray-900">
                    {payment.status === 'pending' && '⏳ معلق'}
                    {payment.status === 'held' && '🔒 محجوز'}
                    {payment.status === 'released' && '✓ مفرج عنه'}
                    {payment.status === 'refunded' && '↩️ مسترد'}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">طريقة الدفع</label>
                  <p className="font-semibold text-gray-900">{payment.payment_method || '-'}</p>
                </div>

                {payment.released_at && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">تاريخ الإفراج</label>
                    <p className="text-sm text-gray-900">
                      {new Date(payment.released_at).toLocaleString('ar-JO')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disputes */}
          {order.disputes && order.disputes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">النزاعات</h2>

              <div className="space-y-4">
                {order.disputes.map((dispute: any) => (
                  <div key={dispute.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{dispute.reason}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        dispute.status === 'opened' ? 'bg-red-100 text-red-800' :
                        dispute.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                        dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {dispute.status === 'opened' && 'مفتوح'}
                        {dispute.status === 'investigating' && 'قيد التحقيق'}
                        {dispute.status === 'resolved' && 'محلول'}
                      </span>
                    </div>
                    {dispute.description && (
                      <p className="text-sm text-gray-700 mb-2">{dispute.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>تاريخ الفتح: {new Date(dispute.created_at).toLocaleDateString('ar-JO')}</span>
                      <Link
                        href={`/admin/disputes/${dispute.id}`}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        عرض التفاصيل ←
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">الملاحظات</h2>

            {order.notes && order.notes.length > 0 ? (
              <div className="space-y-3">
                {order.notes.map((note: any) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-lg ${
                      note.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">{note.created_by_user?.full_name}</p>
                      <div className="flex items-center gap-2">
                        {note.is_internal && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                            داخلي
                          </span>
                        )}
                        <span className="text-xs text-gray-600">
                          {new Date(note.created_at).toLocaleDateString('ar-JO')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{note.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">لا توجد ملاحظات</p>
            )}
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Edit Order */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">تعديل الطلب</h3>
            <EditOrderForm order={order} />
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات سريعة</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">آخر تحديث</label>
                <p className="text-sm text-gray-900">
                  {new Date(order.updated_at).toLocaleString('ar-JO')}
                </p>
              </div>

              {order.internal_reference && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">المرجع الداخلي</label>
                  <p className="text-sm text-gray-900">{order.internal_reference}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-600 block mb-1">رقم التعريف</label>
                <p className="text-xs text-gray-600 font-mono">{order.id}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>

            <div className="space-y-3">
              <Link
                href={`/admin/payments?search=${order.order_number}`}
                className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors text-center"
              >
                عرض الدفع
              </Link>

              {delivery && (
                <Link
                  href={`/supplier/deliveries/${delivery.delivery_id}`}
                  className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors text-center"
                >
                  عرض التوصيل
                </Link>
              )}

              <Link
                href={`/admin/suppliers/${order.supplier_id}`}
                className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors text-center"
              >
                عرض المورد
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
