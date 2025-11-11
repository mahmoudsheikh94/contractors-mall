import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type UserRole = 'contractor' | 'supplier_admin' | 'driver' | 'admin'

async function getUsers(filter?: string, search?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select(`
      *,
      supplier:suppliers!owner_id(
        id,
        business_name,
        is_verified
      )
    `)
    .order('created_at', { ascending: false })

  // Apply role filter
  if (filter && filter !== 'all') {
    query = query.eq('role', filter as any)
  }

  // Apply search filter
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = (await query) as any

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}

export default async function UsersManagementPage({
  searchParams,
}: {
  searchParams: { filter?: string; search?: string }
}) {
  const users = await getUsers(searchParams.filter, searchParams.search)

  // Count by role
  const contractorCount = users.filter(u => u.role === 'contractor').length
  const supplierCount = users.filter(u => u.role === 'supplier_admin').length
  const driverCount = users.filter(u => u.role === 'driver').length
  const adminCount = users.filter(u => u.role === 'admin').length

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
        <p className="text-gray-600 mt-2">عرض وإدارة جميع مستخدمي المنصة</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">إجمالي المستخدمين</h3>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">المقاولون</h3>
            <span className="text-2xl">👷</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{contractorCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">الموردون</h3>
            <span className="text-2xl">🏢</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{supplierCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">السائقون</h3>
            <span className="text-2xl">🚚</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{driverCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <form className="flex-1" action="/admin/users" method="GET">
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              defaultValue={searchParams.search}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
            >
              🔍
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
          <Link
            href="/admin/users"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              !searchParams.filter || searchParams.filter === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({users.length})
          </Link>
          <Link
            href="/admin/users?filter=contractor"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'contractor'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مقاولون ({contractorCount})
          </Link>
          <Link
            href="/admin/users?filter=supplier_admin"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'supplier_admin'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            موردون ({supplierCount})
          </Link>
          <Link
            href="/admin/users?filter=driver"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'driver'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            سائقون ({driverCount})
          </Link>
          <Link
            href="/admin/users?filter=admin"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              searchParams.filter === 'admin'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مديرون ({adminCount})
          </Link>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                الاسم
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                البريد الإلكتروني
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                رقم الهاتف
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                الدور
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                البريد موثق
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-5xl mb-4">👥</div>
                  <p className="text-lg">لا يوجد مستخدمون</p>
                  {searchParams.search && (
                    <p className="text-sm text-gray-600 mt-2">جرب البحث بكلمات مختلفة</p>
                  )}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{user.full_name}</p>
                      {user.role === 'supplier_admin' && user.supplier && (
                        <p className="text-sm text-gray-600">{user.supplier.business_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{user.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'contractor' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                        👷 مقاول
                      </span>
                    )}
                    {user.role === 'supplier_admin' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                        🏢 مورد
                      </span>
                    )}
                    {user.role === 'driver' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                        🚚 سائق
                      </span>
                    )}
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                        👑 مدير
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-semibold">
                        <span>✓</span>
                        <span>موثق</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-600 text-sm font-semibold">
                        <span>⏳</span>
                        <span>غير موثق</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ar-JO')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
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

      {/* Stats Footer */}
      {users.length > 0 && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">معدل التوثيق</p>
              <p className="text-2xl font-bold text-primary-600">
                {Math.round((users.filter(u => u.email_verified).length / users.length) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">موردون موثقون</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.role === 'supplier_admin' && u.supplier?.is_verified).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">مستخدمون جدد (آخر 7 أيام)</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => {
                  const createdAt = new Date(u.created_at)
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return createdAt >= weekAgo
                }).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">نشطون اليوم</p>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter(u => {
                  const lastSignIn = new Date(u.last_sign_in_at)
                  const today = new Date()
                  return lastSignIn.toDateString() === today.toDateString()
                }).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
