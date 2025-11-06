import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OrdersTableWithBulkActions } from '@/components/supplier/orders/OrdersTableWithBulkActions'

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

async function getOrders(
  supplierId: string,
  status?: string,
  search?: string,
  page: number = 1
) {
  const supabase = await createClient()
  const ITEMS_PER_PAGE = 20

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_jod,
      delivery_fee_jod,
      created_at,
      delivery_date,
      delivery_time_slot,
      delivery_address,
      profiles!contractor_id (
        full_name,
        phone
      )
    `, { count: 'exact' })
    .eq('supplier_id', supplierId)

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // Search by order number or contractor name
  if (search) {
    query = query.or(`order_number.ilike.%${search}%`)
  }

  // Pagination
  const from = (page - 1) * ITEMS_PER_PAGE
  query = query
    .order('created_at', { ascending: false })
    .range(from, from + ITEMS_PER_PAGE - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return { orders: [], count: 0 }
  }

  // Fix contractor type (Supabase returns it as profiles but we rename to contractor)
  const orders = data?.map(order => ({
    ...order,
    contractor: order.profiles || null
  })) || []

  return {
    orders,
    count: count || 0,
    totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
  }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const supabase = await createClient()
  const params = await searchParams

  // Get current user and supplier info
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name')
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

  const currentPage = parseInt(params.page || '1')
  const { orders, count, totalPages } = await getOrders(
    supplier.id,
    params.status,
    params.search,
    currentPage
  )

  // Get status counts for filter tabs
  const statusCounts = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'confirmed'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'accepted'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'in_delivery'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'delivered'),
  ])

  const stats = {
    all: statusCounts[0].count || 0,
    confirmed: statusCounts[1].count || 0,
    accepted: statusCounts[2].count || 0,
    in_delivery: statusCounts[3].count || 0,
    delivered: statusCounts[4].count || 0,
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">إدارة الطلبات</h1>
        <p className="text-gray-600 mt-2">
          عرض جميع الطلبات ومتابعة حالتها
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6">
          <form method="get" className="flex gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="بحث برقم الطلب..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              name="status"
              defaultValue={params.status || 'all'}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">جميع الطلبات</option>
              <option value="confirmed">جديد (معلق)</option>
              <option value="accepted">مقبول</option>
              <option value="in_delivery">قيد التوصيل</option>
              <option value="delivered">تم التوصيل</option>
              <option value="completed">مكتمل</option>
              <option value="rejected">مرفوض</option>
              <option value="disputed">متنازع عليه</option>
            </select>

            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              بحث
            </button>
          </form>
        </div>

        {/* Status Tabs */}
        <div className="border-t border-gray-200">
          <div className="flex overflow-x-auto">
            <StatusTab
              href="/supplier/orders?status=all"
              label="الكل"
              count={stats.all}
              active={!params.status || params.status === 'all'}
            />
            <StatusTab
              href="/supplier/orders?status=confirmed"
              label="جديد"
              count={stats.confirmed}
              active={params.status === 'confirmed'}
              highlight
            />
            <StatusTab
              href="/supplier/orders?status=accepted"
              label="مقبول"
              count={stats.accepted}
              active={params.status === 'accepted'}
            />
            <StatusTab
              href="/supplier/orders?status=in_delivery"
              label="قيد التوصيل"
              count={stats.in_delivery}
              active={params.status === 'in_delivery'}
            />
            <StatusTab
              href="/supplier/orders?status=delivered"
              label="تم التوصيل"
              count={stats.delivered}
              active={params.status === 'delivered'}
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm">
        {orders.length > 0 ? (
          <>
            <OrdersTableWithBulkActions orders={orders} searchParams={params} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    عرض {orders.length} من أصل {count} طلب
                  </div>
                  <div className="flex gap-2">
                    {currentPage > 1 && (
                      <Link
                        href={`/supplier/orders?${new URLSearchParams({
                          ...params,
                          page: String(currentPage - 1),
                        })}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        → السابق
                      </Link>
                    )}
                    <div className="px-4 py-2 text-sm text-gray-700">
                      صفحة {currentPage} من {totalPages}
                    </div>
                    {currentPage < totalPages && (
                      <Link
                        href={`/supplier/orders?${new URLSearchParams({
                          ...params,
                          page: String(currentPage + 1),
                        })}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        التالي ←
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <span className="text-6xl">📭</span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              لا توجد طلبات
            </h3>
            <p className="mt-2 text-gray-600">
              {params.status || params.search
                ? 'لم يتم العثور على طلبات تطابق البحث'
                : 'لم تستلم أي طلبات بعد'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusTab({
  href,
  label,
  count,
  active,
  highlight = false,
}: {
  href: string
  label: string
  count: number
  active: boolean
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`
        flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors
        ${
          active
            ? highlight
              ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
              : 'border-primary-500 text-primary-700 bg-primary-50'
            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }
      `}
    >
      {label} <span className="text-xs">({count})</span>
    </Link>
  )
}
