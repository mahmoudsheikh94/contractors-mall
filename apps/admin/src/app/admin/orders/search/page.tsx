import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OrdersTableWithBulkActions from '@/components/orders/OrdersTableWithBulkActions'
import AdvancedSearchPanel from '@/components/orders/AdvancedSearchPanel'

async function searchOrders(searchParams: any) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Check if user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/auth/login')
  }

  // Build query params for search API
  const params = new URLSearchParams()

  if (searchParams.q) params.set('q', searchParams.q)

  // Handle multiple status values
  const statuses = Array.isArray(searchParams.status)
    ? searchParams.status
    : searchParams.status
    ? [searchParams.status]
    : []
  statuses.forEach((s: string) => params.append('status', s))

  // Handle multiple payment status values
  const paymentStatuses = Array.isArray(searchParams.paymentStatus)
    ? searchParams.paymentStatus
    : searchParams.paymentStatus
    ? [searchParams.paymentStatus]
    : []
  paymentStatuses.forEach((p: string) => params.append('paymentStatus', p))

  if (searchParams.minAmount) params.set('minAmount', searchParams.minAmount)
  if (searchParams.maxAmount) params.set('maxAmount', searchParams.maxAmount)
  if (searchParams.startDate) params.set('startDate', searchParams.startDate)
  if (searchParams.endDate) params.set('endDate', searchParams.endDate)
  if (searchParams.vehicleType) params.set('vehicleType', searchParams.vehicleType)
  if (searchParams.deliveryZone) params.set('deliveryZone', searchParams.deliveryZone)

  const page = searchParams.page || '1'
  params.set('page', page)
  params.set('limit', '20')

  // Call the search API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/admin/orders/search?${params.toString()}`,
    {
      headers: {
        Cookie: `${await supabase.auth.getSession().then(s => s.data.session?.access_token ? `sb-access-token=${s.data.session.access_token}` : '')}`,
      },
    }
  )

  if (!response.ok) {
    console.error('Search API error:', await response.text())
    return { orders: [], pagination: null, filters: {} }
  }

  const data = await response.json()
  return data
}

export default async function OrdersSearchPage({
  searchParams,
}: {
  searchParams: any
}) {
  const { orders, pagination, filters } = await searchOrders(searchParams)

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">نتائج البحث</h1>
            <p className="text-gray-600 mt-2">
              {pagination?.total || 0} طلب
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            <span>←</span>
            <span>العودة لجميع الطلبات</span>
          </Link>
        </div>
      </div>

      {/* Search Panel */}
      <AdvancedSearchPanel />

      {/* Active Filters Display */}
      {(filters.searchQuery || filters.status?.length > 0 || filters.minAmount || filters.maxAmount) && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">الفلاتر النشطة:</h3>
          <div className="flex flex-wrap gap-2">
            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <span>🔍</span>
                <span>بحث: {filters.searchQuery}</span>
              </span>
            )}
            {filters.status?.map((s: string) => (
              <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <span>الحالة: {s}</span>
              </span>
            ))}
            {filters.minAmount && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <span>من: {filters.minAmount} د.أ</span>
              </span>
            )}
            {filters.maxAmount && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <span>إلى: {filters.maxAmount} د.أ</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Orders Table with Bulk Actions */}
      <OrdersTableWithBulkActions orders={orders} currentFilters={filters} />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {pagination.hasPreviousPage && (
            <Link
              href={`?${new URLSearchParams({ ...searchParams, page: (parseInt(searchParams.page || '1') - 1).toString() }).toString()}`}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              السابق
            </Link>
          )}

          <span className="px-4 py-2 text-sm text-gray-700">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>

          {pagination.hasNextPage && (
            <Link
              href={`?${new URLSearchParams({ ...searchParams, page: (parseInt(searchParams.page || '1') + 1).toString() }).toString()}`}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              التالي
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
