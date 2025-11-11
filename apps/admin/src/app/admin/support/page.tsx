import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ActivityFeedCard from '@/components/support/ActivityFeedCard'
import QuickStatsCards from '@/components/support/QuickStatsCards'

async function getSupportData() {
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

  // Fetch stats and activity feed in parallel
  const [statsResponse, activityResponse] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/admin/dashboard/stats?timeRange=24h`,
      {
        headers: {
          Cookie: `${await supabase.auth.getSession().then(s => s.data.session?.access_token ? `sb-access-token=${s.data.session.access_token}` : '')}`,
        },
      }
    ),
    fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/admin/dashboard/activity-feed?limit=50`,
      {
        headers: {
          Cookie: `${await supabase.auth.getSession().then(s => s.data.session?.access_token ? `sb-access-token=${s.data.session.access_token}` : '')}`,
        },
      }
    ),
  ])

  const stats = statsResponse.ok ? await statsResponse.json() : null
  const activityData = activityResponse.ok ? await activityResponse.json() : { activities: [] }

  return { stats, activities: activityData.activities || [] }
}

export default async function SupportDashboardPage() {
  const { stats, activities } = await getSupportData()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">لوحة الدعم</h1>
        <p className="text-gray-600 mt-2">إدارة المنصة ومتابعة النشاطات</p>
      </div>

      {/* Quick Stats */}
      {stats && <QuickStatsCards stats={stats} />}

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/orders"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📦</span>
            <h3 className="text-lg font-bold text-gray-900">الطلبات</h3>
          </div>
          <p className="text-sm text-gray-600">إدارة جميع الطلبات في المنصة</p>
        </Link>

        <Link
          href="/admin/disputes"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚖️</span>
            <h3 className="text-lg font-bold text-gray-900">النزاعات</h3>
          </div>
          <p className="text-sm text-gray-600">معالجة النزاعات والشكاوى</p>
        </Link>

        <Link
          href="/admin/support/messages"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💬</span>
            <h3 className="text-lg font-bold text-gray-900">الرسائل</h3>
          </div>
          <p className="text-sm text-gray-600">محادثات الدعم مع المستخدمين</p>
          {stats?.activity?.unreadMessages > 0 && (
            <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
              {stats.activity.unreadMessages} غير مقروءة
            </span>
          )}
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">نشاطات حديثة</h2>
          <p className="text-sm text-gray-600 mt-1">آخر 50 نشاط في المنصة</p>
        </div>

        <div className="divide-y divide-gray-200">
          {activities.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-lg">لا توجد نشاطات حالياً</p>
            </div>
          ) : (
            activities.map((activity: any, index: number) => (
              <ActivityFeedCard key={index} activity={activity} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
