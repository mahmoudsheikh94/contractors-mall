import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getSuppliers(filter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('suppliers')
    .select(`
      *,
      owner:profiles!owner_id(
        id,
        full_name,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter === 'pending') {
    query = query.eq('is_verified', false)
  } else if (filter === 'verified') {
    query = query.eq('is_verified', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }

  return data || []
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const suppliers = await getSuppliers(searchParams.filter)

  const pendingCount = suppliers.filter(s => !s.is_verified).length
  const verifiedCount = suppliers.filter(s => s.is_verified).length

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إدارة الموردين</h1>
        <p className="text-gray-600 mt-2">مراجعة وتوثيق الموردين المسجلين</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200">
          <Link
            href="/admin/suppliers"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              !searchParams.filter
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({suppliers.length})
          </Link>
          <Link
            href="/admin/suppliers?filter=pending"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'pending'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            معلق ({pendingCount})
          </Link>
          <Link
            href="/admin/suppliers?filter=verified"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.filter === 'verified'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            موثق ({verifiedCount})
          </Link>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                اسم المنشأة
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                المالك
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                البريد الإلكتروني
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                رقم الهاتف
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                الحالة
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                تاريخ التسجيل
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-lg">لا يوجد موردون</p>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{supplier.business_name}</p>
                      {supplier.business_name_en && (
                        <p className="text-sm text-gray-600">{supplier.business_name_en}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{supplier.owner?.full_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{supplier.owner?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{supplier.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    {supplier.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        <span>✓</span>
                        <span>موثق</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                        <span>⏳</span>
                        <span>معلق</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">
                      {new Date(supplier.created_at).toLocaleDateString('ar-JO')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/suppliers/${supplier.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <span>عرض</span>
                      <span>←</span>
                    </Link>
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
