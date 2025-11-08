import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getUserDetails(id: string) {
  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('profiles')
    .select(`
      *,
      supplier:suppliers!owner_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  // Get user activity based on role
  let orders = []
  let deliveries = []

  if (user.role === 'contractor') {
    const { data: contractorOrders } = await supabase
      .from('orders')
      .select('*, supplier:suppliers!supplier_id(business_name)')
      .eq('contractor_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    orders = contractorOrders || []
  } else if (user.role === 'supplier_admin' && user.supplier) {
    const { data: supplierOrders } = await supabase
      .from('orders')
      .select('*, contractor:profiles!contractor_id(full_name)')
      .eq('supplier_id', user.supplier.id)
      .order('created_at', { ascending: false })
      .limit(10)

    orders = supplierOrders || []
  } else if (user.role === 'driver') {
    const { data: driverDeliveries } = await supabase
      .from('deliveries')
      .select('*, order:orders!order_id(*)')
      .eq('driver_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    deliveries = driverDeliveries || []
  }

  return {
    ...user,
    orders,
    deliveries,
  }
}

export default async function UserDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getUserDetails(params.id)

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          المستخدم غير موجود
        </h2>
        <Link
          href="/admin/users"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للمستخدمين
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للمستخدمين
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.full_name}
            </h1>
            <p className="text-gray-600 mt-2">معلومات المستخدم</p>
          </div>

          {/* Role Badge */}
          <div>
            {user.role === 'contractor' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 text-lg font-semibold rounded-lg">
                <span>👷</span>
                <span>مقاول</span>
              </span>
            )}
            {user.role === 'supplier_admin' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 text-lg font-semibold rounded-lg">
                <span>🏢</span>
                <span>مورد</span>
              </span>
            )}
            {user.role === 'driver' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 text-lg font-semibold rounded-lg">
                <span>🚚</span>
                <span>سائق</span>
              </span>
            )}
            {user.role === 'admin' && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 text-lg font-semibold rounded-lg">
                <span>👑</span>
                <span>مدير نظام</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">المعلومات الأساسية</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">الاسم الكامل</label>
                <p className="font-semibold text-gray-900">{user.full_name}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">البريد الإلكتروني</label>
                <p className="font-semibold text-gray-900">{user.email}</p>
                {user.email_verified ? (
                  <p className="text-sm text-green-600 mt-1">✓ موثق</p>
                ) : (
                  <p className="text-sm text-yellow-600 mt-1">⏳ غير موثق</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">رقم الهاتف</label>
                <p className="font-semibold text-gray-900">{user.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">الدور</label>
                <p className="font-semibold text-gray-900">
                  {user.role === 'contractor' && 'مقاول'}
                  {user.role === 'supplier_admin' && 'مورد'}
                  {user.role === 'driver' && 'سائق'}
                  {user.role === 'admin' && 'مدير نظام'}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">تاريخ التسجيل</label>
                <p className="font-semibold text-gray-900">
                  {new Date(user.created_at).toLocaleString('ar-JO')}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">آخر تسجيل دخول</label>
                <p className="font-semibold text-gray-900">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ar-JO') : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Information (if supplier) */}
          {user.role === 'supplier_admin' && user.supplier && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">معلومات المورد</h2>
                <Link
                  href={`/admin/suppliers/${user.supplier.id}`}
                  className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                >
                  عرض التفاصيل ←
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">اسم المنشأة</label>
                  <p className="font-semibold text-gray-900">{user.supplier.business_name}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">حالة التوثيق</label>
                  {user.supplier.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                      <span>✓</span>
                      <span>موثق</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold">
                      <span>⏳</span>
                      <span>بانتظار التوثيق</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">رصيد المحفظة</label>
                  <p className="text-2xl font-bold text-green-600">
                    {user.supplier.wallet_balance.toFixed(2)} JOD
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">التقييم</label>
                  <p className="text-2xl font-bold text-primary-600">
                    {user.supplier.rating_average > 0 ? user.supplier.rating_average.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {(user.orders.length > 0 || user.deliveries.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">النشاط الأخير</h2>

              {/* Orders */}
              {user.orders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">الطلبات (آخر 10)</h3>
                  {user.orders.map((order: any) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:border-primary-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">#{order.order_number}</p>
                          <p className="text-sm text-gray-600">
                            {user.role === 'contractor' ? order.supplier?.business_name : order.contractor?.full_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{Number(order.total_jod).toFixed(2)} JOD</p>
                          <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString('ar-JO')}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Deliveries */}
              {user.deliveries.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">التوصيلات (آخر 10)</h3>
                  {user.deliveries.map((delivery: any) => (
                    <div
                      key={delivery.delivery_id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">طلب #{delivery.order?.order_number}</p>
                          <p className="text-sm text-gray-600">{delivery.city}</p>
                        </div>
                        <div className="text-right">
                          {delivery.completed_at ? (
                            <span className="text-sm text-green-600 font-semibold">✓ مكتمل</span>
                          ) : (
                            <span className="text-sm text-yellow-600 font-semibold">⏳ معلق</span>
                          )}
                          <p className="text-sm text-gray-600">{new Date(delivery.scheduled_date).toLocaleDateString('ar-JO')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات سريعة</h3>

            <div className="space-y-4">
              {user.role === 'contractor' && (
                <>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">عدد الطلبات</label>
                    <p className="text-2xl font-bold text-primary-600">{user.orders.length}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">إجمالي الإنفاق</label>
                    <p className="text-2xl font-bold text-green-600">
                      {user.orders.reduce((sum: number, o: any) => sum + Number(o.total_jod), 0).toFixed(2)} JOD
                    </p>
                  </div>
                </>
              )}

              {user.role === 'supplier_admin' && user.supplier && (
                <>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">عدد الطلبات</label>
                    <p className="text-2xl font-bold text-primary-600">{user.orders.length}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">الإيرادات</label>
                    <p className="text-2xl font-bold text-green-600">
                      {user.orders.reduce((sum: number, o: any) => sum + Number(o.total_jod), 0).toFixed(2)} JOD
                    </p>
                  </div>
                </>
              )}

              {user.role === 'driver' && (
                <>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">عدد التوصيلات</label>
                    <p className="text-2xl font-bold text-primary-600">{user.deliveries.length}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">مكتملة</label>
                    <p className="text-2xl font-bold text-green-600">
                      {user.deliveries.filter((d: any) => d.completed_at).length}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">حالة الحساب</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">البريد موثق</span>
                {user.email_verified ? (
                  <span className="text-sm text-green-600 font-semibold">✓ نعم</span>
                ) : (
                  <span className="text-sm text-red-600 font-semibold">✗ لا</span>
                )}
              </div>

              {user.role === 'supplier_admin' && user.supplier && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">المورد موثق</span>
                  {user.supplier.is_verified ? (
                    <span className="text-sm text-green-600 font-semibold">✓ نعم</span>
                  ) : (
                    <span className="text-sm text-red-600 font-semibold">✗ لا</span>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <label className="text-xs text-gray-600 block mb-1">رقم التعريف</label>
                <p className="text-xs text-gray-600 font-mono break-all">{user.id}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>

            <div className="space-y-3">
              {user.role === 'contractor' && (
                <Link
                  href={`/admin/orders?contractor_id=${user.id}`}
                  className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors text-center"
                >
                  عرض جميع الطلبات
                </Link>
              )}

              {user.role === 'supplier_admin' && user.supplier && (
                <>
                  <Link
                    href={`/admin/suppliers/${user.supplier.id}`}
                    className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors text-center"
                  >
                    عرض صفحة المورد
                  </Link>
                  <Link
                    href={`/admin/orders?supplier_id=${user.supplier.id}`}
                    className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors text-center"
                  >
                    عرض طلبات المورد
                  </Link>
                </>
              )}

              <button
                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-900 font-semibold rounded-lg transition-colors"
                onClick={() => alert('سيتم إضافة هذه الميزة قريباً')}
              >
                تعطيل الحساب
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
