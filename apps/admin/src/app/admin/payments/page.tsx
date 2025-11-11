import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getPayments(filter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('payments')
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
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter && filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching payments:', error)
    return []
  }

  return (data || []) as any
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const payments = await getPayments(searchParams.filter)

  // Calculate totals
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount_jod), 0)
  const heldAmount = payments.filter(p => p.status === 'held').reduce((sum, p) => sum + Number(p.amount_jod), 0)
  const releasedAmount = payments.filter(p => p.status === 'released').reduce((sum, p) => sum + Number(p.amount_jod), 0)
  const refundedAmount = payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + Number(p.amount_jod), 0)

  // Count by status
  const heldCount = payments.filter(p => p.status === 'held').length
  const releasedCount = payments.filter(p => p.status === 'released').length
  const refundedCount = payments.filter(p => p.status === 'refunded').length
  const pendingCount = payments.filter(p => p.status === 'pending').length

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إدارة المدفوعات</h1>
        <p className="text-gray-600 mt-2">مراقبة وإدارة جميع المدفوعات والضمانات</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">إجمالي المدفوعات</h3>
          <p className="text-3xl font-bold text-gray-900">{totalAmount.toFixed(0)} JOD</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">محجوز (Escrow)</h3>
          <p className="text-3xl font-bold text-yellow-600">{heldAmount.toFixed(0)} JOD</p>
          <p className="text-sm text-gray-600 mt-1">{heldCount} طلب</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">مفرج عنه</h3>
          <p className="text-3xl font-bold text-green-600">{releasedAmount.toFixed(0)} JOD</p>
          <p className="text-sm text-gray-600 mt-1">{releasedCount} طلب</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">مسترد</h3>
          <p className="text-3xl font-bold text-red-600">{refundedAmount.toFixed(0)} JOD</p>
          <p className="text-sm text-gray-600 mt-1">{refundedCount} طلب</p>
        </div>
      </div>

      {/* Escrow Link */}
      <div className="mb-6">
        <Link
          href="/admin/payments/escrow"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
        >
          <span>💰</span>
          <span>إدارة الضمانات المحجوزة ({heldCount})</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200">
          <Link
            href="/admin/payments"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              !searchParams.filter || searchParams.filter === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({payments.length})
          </Link>
          <Link
            href="/admin/payments?filter=pending"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'pending'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            معلق ({pendingCount})
          </Link>
          <Link
            href="/admin/payments?filter=held"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'held'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            محجوز ({heldCount})
          </Link>
          <Link
            href="/admin/payments?filter=released"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'released'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مفرج ({releasedCount})
          </Link>
          <Link
            href="/admin/payments?filter=refunded"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'refunded'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مسترد ({refundedCount})
          </Link>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                رقم الطلب
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                المقاول
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                المورد
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                المبلغ
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                الحالة
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                التاريخ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-5xl mb-4">💳</div>
                  <p className="text-lg">لا توجد مدفوعات</p>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="font-semibold text-primary-600 hover:text-primary-700"
                    >
                      {payment.order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{payment.order.contractor?.full_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{payment.order.supplier?.business_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{Number(payment.amount_jod).toFixed(2)} JOD</p>
                  </td>
                  <td className="px-6 py-4">
                    {payment.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
                        ⏳ معلق
                      </span>
                    )}
                    {payment.status === 'held' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                        🔒 محجوز
                      </span>
                    )}
                    {payment.status === 'released' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        ✓ مفرج عنه
                      </span>
                    )}
                    {payment.status === 'refunded' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                        ↩️ مسترد
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString('ar-JO')}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
