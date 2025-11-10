import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@contractors-mall/ui'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: any | null }

  if (!profile) {
    redirect('/auth/complete-profile')
  }

  // Redirect suppliers to their dashboard
  if (profile.role === 'supplier_admin') {
    redirect('/supplier/dashboard')
  }

  // Get active orders count
  const { count: activeOrdersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('contractor_id', user.id)
    .in('status', ['pending', 'confirmed', 'accepted', 'in_delivery', 'delivered'] as any)

  // Get recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_jod,
      created_at,
      scheduled_delivery_date,
      scheduled_delivery_time,
      suppliers (
        business_name
      )
    `)
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">مول المقاول</h1>
            <p className="mt-1 text-sm text-gray-600">
              مرحباً، {profile.full_name}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline" size="sm">
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        تصفح المواد
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ابحث عن مواد البناء
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5">
                  <Link href="/products">
                    <Button variant="primary" className="w-full">
                      تصفح
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        طلباتي
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {activeOrdersCount || 0} طلب نشط
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5">
                  <Link href="/orders">
                    <Button variant="outline" className="w-full">
                      عرض الطلبات
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        الخريطة
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        الموردين القريبين
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5">
                  <Link href="/map">
                    <Button variant="outline" className="w-full">
                      عرض الخريطة
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  الطلبات الأخيرة
                </h3>
                {recentOrders && recentOrders.length > 0 && (
                  <Link href="/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    عرض الكل ←
                  </Link>
                )}
              </div>

              {recentOrders && recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الطلب</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {order.suppliers?.business_name || 'غير محدد'}
                          </td>
                          <td className="px-4 py-3">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {order.total_jod.toFixed(2)} د.أ
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('ar-JO')}
                          </td>
                          <td className="px-4 py-3 text-sm text-left">
                            <Link
                              href={`/orders/${order.id}`}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              عرض ←
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    لا توجد طلبات بعد
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    ابدأ بتصفح مواد البناء وإضافتها إلى السلة
                  </p>
                  <div className="mt-6">
                    <Link href="/products">
                      <Button variant="primary">
                        تصفح المواد
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'مؤكد', className: 'bg-blue-100 text-blue-800' },
    accepted: { label: 'مقبول', className: 'bg-green-100 text-green-800' },
    in_delivery: { label: 'قيد التوصيل', className: 'bg-purple-100 text-purple-800' },
    awaiting_contractor_confirmation: { label: 'بانتظار تأكيدك', className: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: 'تم التوصيل', className: 'bg-teal-100 text-teal-800' },
    completed: { label: 'مكتمل', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'ملغي', className: 'bg-gray-100 text-gray-800' },
    rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800' },
    disputed: { label: 'متنازع عليه', className: 'bg-orange-100 text-orange-800' },
  }

  const config = configs[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}