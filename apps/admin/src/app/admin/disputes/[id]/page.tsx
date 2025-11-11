import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DisputeQCActions } from './DisputeQCActions'

async function getDisputeDetails(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      order:orders!inner(
        *,
        contractor:profiles!contractor_id(full_name, phone, email),
        supplier:suppliers!supplier_id(business_name, phone, email),
        delivery:deliveries(*)
      ),
      opened_by_user:profiles!opened_by(full_name, phone, email),
      payment:payments!order_id(id, status, amount_jod)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching dispute:', error)
    return null
  }

  // Type assertion for complex join query
  return data as any
}

export default async function DisputeDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const dispute = await getDisputeDetails(params.id)

  if (!dispute) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          النزاع غير موجود
        </h2>
        <Link
          href="/admin/disputes"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للنزاعات
        </Link>
      </div>
    )
  }

  const isHighValue = Number(dispute.order.total_jod) >= 350 // Default threshold

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/disputes"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للنزاعات
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              نزاع على طلب #{dispute.order.order_number}
            </h1>
            <p className="text-gray-600 mt-2">تفاصيل النزاع وإجراءات مراقبة الجودة</p>
          </div>
          <div>
            {dispute.status === 'opened' && (
              <span className="px-4 py-2 bg-red-100 text-red-800 font-semibold rounded-lg">
                مفتوح
              </span>
            )}
            {dispute.status === 'investigating' && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 font-semibold rounded-lg">
                قيد التحقيق
              </span>
            )}
            {dispute.status === 'resolved' && (
              <span className="px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-lg">
                محلول
              </span>
            )}
          </div>
        </div>
      </div>

      {/* High Value Warning */}
      {isHighValue && !dispute.site_visit_completed && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                طلب عالي القيمة - زيارة ميدانية مطلوبة
              </h3>
              <p className="text-orange-800">
                قيمة الطلب ({Number(dispute.order.total_jod).toFixed(2)} JOD) تتجاوز العتبة المحددة.
                {dispute.site_visit_required
                  ? ' تم تحديد زيارة ميدانية لهذا النزاع.'
                  : ' يُنصح بتحديد زيارة ميدانية للتحقق من الموقع.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات النزاع</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">السبب</label>
                <p className="font-semibold text-gray-900">{dispute.reason}</p>
              </div>

              {dispute.description && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">الوصف التفصيلي</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{dispute.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-600 block mb-1">فُتح بواسطة</label>
                <p className="font-semibold text-gray-900">{dispute.opened_by_user?.full_name}</p>
                <p className="text-sm text-gray-600">{dispute.opened_by_user?.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">تاريخ الفتح</label>
                <p className="text-sm text-gray-900">
                  {new Date(dispute.created_at).toLocaleString('ar-JO')}
                </p>
              </div>

              {dispute.resolved_at && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">تاريخ الحل</label>
                    <p className="text-sm text-gray-900">
                      {new Date(dispute.resolved_at).toLocaleString('ar-JO')}
                    </p>
                  </div>

                  {dispute.resolution && (
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">الحل</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{dispute.resolution}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات الطلب</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">رقم الطلب</label>
                <p className="font-semibold text-gray-900">{dispute.order.order_number}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">قيمة الطلب</label>
                <p className="font-semibold text-gray-900">{Number(dispute.order.total_jod).toFixed(2)} JOD</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">المقاول</label>
                <p className="font-semibold text-gray-900">{dispute.order.contractor?.full_name}</p>
                <p className="text-sm text-gray-600">{dispute.order.contractor?.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">المورد</label>
                <p className="font-semibold text-gray-900">{dispute.order.supplier?.business_name}</p>
                <p className="text-sm text-gray-600">{dispute.order.supplier?.phone}</p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">عنوان التوصيل</label>
                <p className="text-sm text-gray-900">{dispute.order.delivery_address}</p>
              </div>
            </div>
          </div>

          {/* QC Notes & Actions */}
          {dispute.qc_notes && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">ملاحظات مراقبة الجودة</h3>
              <p className="text-blue-800 whitespace-pre-wrap">{dispute.qc_notes}</p>
              {dispute.qc_action && (
                <>
                  <h4 className="font-semibold text-blue-900 mt-4 mb-2">الإجراء المتخذ</h4>
                  <p className="text-blue-800 whitespace-pre-wrap">{dispute.qc_action}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Payment Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">حالة الدفع</h3>

            {dispute.payment?.[0] && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">المبلغ</label>
                  <p className="text-2xl font-bold text-gray-900">
                    {Number(dispute.payment[0].amount_jod).toFixed(2)} JOD
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">الحالة</label>
                  {dispute.payment[0].status === 'held' && (
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                      🔒 محجوز
                    </span>
                  )}
                  {dispute.payment[0].status === 'released' && (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                      ✓ مفرج عنه
                    </span>
                  )}
                  {dispute.payment[0].status === 'refunded' && (
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                      ↩️ مسترد
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 mt-2">
                  ⚠️ الدفع محجوز أثناء التحقيق في النزاع
                </p>
              </div>
            )}
          </div>

          {/* Site Visit */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">الزيارة الميدانية</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">مطلوبة؟</label>
                <p className="font-semibold">
                  {dispute.site_visit_required ? (
                    <span className="text-orange-600">نعم</span>
                  ) : (
                    <span className="text-gray-600">لا</span>
                  )}
                </p>
              </div>

              {dispute.site_visit_required && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">مكتملة؟</label>
                  <p className="font-semibold">
                    {dispute.site_visit_completed ? (
                      <span className="text-green-600">✓ نعم</span>
                    ) : (
                      <span className="text-red-600">✗ لا</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QC Actions Panel */}
          {dispute.status !== 'resolved' && (
            <DisputeQCActions
              disputeId={dispute.id}
              currentStatus={dispute.status}
              siteVisitRequired={dispute.site_visit_required}
              siteVisitCompleted={dispute.site_visit_completed}
            />
          )}
        </div>
      </div>
    </div>
  )
}
