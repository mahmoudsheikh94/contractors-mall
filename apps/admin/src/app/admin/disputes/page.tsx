import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getDisputes(filter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('disputes')
    .select(`
      *,
      order:orders!inner(
        id,
        order_number,
        total_jod,
        contractor_id,
        supplier_id,
        contractor:profiles!contractor_id(full_name),
        supplier:suppliers!supplier_id(business_name)
      ),
      opened_by_user:profiles!opened_by(full_name)
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter === 'active') {
    query = query.in('status', ['opened', 'investigating'])
  } else if (filter === 'site_visit_required') {
    query = query.eq('site_visit_required', true).eq('site_visit_completed', false)
  } else if (filter && filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching disputes:', error)
    return []
  }

  return data || []
}

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const disputes = await getDisputes(searchParams.filter)

  // Count by status
  const activeCount = disputes.filter(d => ['opened', 'investigating'].includes(d.status)).length
  const siteVisitRequiredCount = disputes.filter(d => d.site_visit_required && !d.site_visit_completed).length
  const resolvedCount = disputes.filter(d => d.status === 'resolved').length

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إدارة النزاعات</h1>
        <p className="text-gray-600 mt-2">متابعة ومعالجة النزاعات بين المقاولين والموردين</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">النزاعات النشطة</h3>
            <span className="text-2xl">🔴</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{activeCount}</p>
          <p className="text-sm text-gray-600 mt-2">تحتاج إلى إجراء</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">زيارات ميدانية مطلوبة</h3>
            <span className="text-2xl">🚗</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{siteVisitRequiredCount}</p>
          <p className="text-sm text-gray-600 mt-2">تتطلب زيارة موقع</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">نزاعات محلولة</h3>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{resolvedCount}</p>
          <p className="text-sm text-gray-600 mt-2">تم حلها</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200">
          <Link
            href="/admin/disputes"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              !searchParams.filter || searchParams.filter === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({disputes.length})
          </Link>
          <Link
            href="/admin/disputes?filter=active"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'active'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            نشط ({activeCount})
          </Link>
          <Link
            href="/admin/disputes?filter=site_visit_required"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'site_visit_required'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            زيارة مطلوبة ({siteVisitRequiredCount})
          </Link>
          <Link
            href="/admin/disputes?filter=resolved"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'resolved'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            محلول ({resolvedCount})
          </Link>
        </div>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">لا توجد نزاعات</h3>
          <p className="text-gray-600">
            {searchParams.filter === 'active' ? 'لا توجد نزاعات نشطة حالياً' : 'لا توجد نزاعات'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/admin/disputes/${dispute.id}`}
              className="block bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-600 transition-colors p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      نزاع على طلب #{dispute.order.order_number}
                    </h3>
                    {dispute.status === 'opened' && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        مفتوح
                      </span>
                    )}
                    {dispute.status === 'investigating' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        قيد التحقيق
                      </span>
                    )}
                    {dispute.status === 'resolved' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        محلول
                      </span>
                    )}
                    {dispute.status === 'escalated' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                        مصعَّد
                      </span>
                    )}
                    {dispute.site_visit_required && !dispute.site_visit_completed && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                        🚗 زيارة مطلوبة
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-gray-600">المقاول</label>
                      <p className="text-sm font-semibold text-gray-900">{dispute.order.contractor?.full_name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">المورد</label>
                      <p className="text-sm font-semibold text-gray-900">{dispute.order.supplier?.business_name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">قيمة الطلب</label>
                      <p className="text-sm font-semibold text-gray-900">{Number(dispute.order.total_jod).toFixed(2)} JOD</p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-600">السبب</label>
                    <p className="text-sm text-gray-900">{dispute.reason}</p>
                  </div>

                  {/* Description */}
                  {dispute.description && (
                    <div className="mb-3">
                      <label className="text-xs text-gray-600">الوصف</label>
                      <p className="text-sm text-gray-900 line-clamp-2">{dispute.description}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>فُتح بواسطة: {dispute.opened_by_user?.full_name}</span>
                    <span>{new Date(dispute.created_at).toLocaleDateString('ar-JO')}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="mr-4 text-primary-600">
                  <span className="text-xl">←</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
