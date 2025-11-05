import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EscrowActions } from './EscrowActions'

async function getHeldPayments() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      order:orders!inner(
        id,
        order_number,
        total_jod,
        status,
        created_at,
        contractor_id,
        supplier_id,
        contractor:profiles!contractor_id(full_name, phone),
        supplier:suppliers!supplier_id(business_name, phone),
        delivery:deliveries(
          id,
          completed_at,
          pin_verified,
          proof_photo_url
        )
      )
    `)
    .eq('status', 'held')
    .order('held_at', { ascending: true })

  if (error) {
    console.error('Error fetching held payments:', error)
    return []
  }

  return data || []
}

export default async function EscrowPage() {
  const heldPayments = await getHeldPayments()

  const totalHeld = heldPayments.reduce((sum, p) => sum + Number(p.amount_jod), 0)

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/payments"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للمدفوعات
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">إدارة الضمانات المحجوزة</h1>
        <p className="text-gray-600 mt-2">المدفوعات المحجوزة في انتظار الإفراج أو الاسترداد</p>
      </div>

      {/* Summary */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">إجمالي المحجوز</h3>
            <p className="text-4xl font-bold text-yellow-900">{totalHeld.toFixed(2)} JOD</p>
            <p className="text-sm text-yellow-800 mt-2">{heldPayments.length} طلب محجوز</p>
          </div>
          <span className="text-6xl">🔒</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">إرشادات الإفراج/الاسترداد</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>الإفراج:</strong> تحويل المبلغ للمورد بعد تأكيد استلام الطلب</li>
              <li>• <strong>الاسترداد:</strong> إعادة المبلغ للمقاول في حالة إلغاء الطلب أو مشكلة</li>
              <li>• جميع الإجراءات يتم تسجيلها في سجل النظام مع تاريخها ومعرف المسؤول</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Held Payments List */}
      {heldPayments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">لا توجد مدفوعات محجوزة</h3>
          <p className="text-gray-600">جميع المدفوعات تم معالجتها</p>
        </div>
      ) : (
        <div className="space-y-6">
          {heldPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      طلب #{payment.order.order_number}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      محجوز منذ {new Date(payment.held_at!).toLocaleString('ar-JO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{Number(payment.amount_jod).toFixed(2)} JOD</p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full mt-2">
                      🔒 محجوز
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">المقاول</label>
                    <p className="font-semibold text-gray-900">{payment.order.contractor?.full_name}</p>
                    <p className="text-sm text-gray-600">{payment.order.contractor?.phone}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-1">المورد</label>
                    <p className="font-semibold text-gray-900">{payment.order.supplier?.business_name}</p>
                    <p className="text-sm text-gray-600">{payment.order.supplier?.phone}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-1">حالة الطلب</label>
                    <p className="font-semibold text-gray-900">
                      {payment.order.status === 'delivered' ? 'تم التوصيل' : payment.order.status}
                    </p>
                    {payment.order.delivery?.[0]?.completed_at && (
                      <p className="text-sm text-green-600">
                        ✓ اكتمل التوصيل
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Verification */}
                {payment.order.delivery?.[0] && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">تأكيد التوصيل</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">رمز PIN</label>
                        <p className="text-sm">
                          {payment.order.delivery[0].pin_verified ? (
                            <span className="text-green-600 font-semibold">✓ تم التحقق</span>
                          ) : (
                            <span className="text-gray-600">لا يتطلب</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">صورة الإثبات</label>
                        <p className="text-sm">
                          {payment.order.delivery[0].proof_photo_url ? (
                            <a
                              href={payment.order.delivery[0].proof_photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                              عرض الصورة ←
                            </a>
                          ) : (
                            <span className="text-gray-600">لا توجد</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <EscrowActions
                  paymentId={payment.id}
                  orderId={payment.order_id}
                  amount={Number(payment.amount_jod)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
