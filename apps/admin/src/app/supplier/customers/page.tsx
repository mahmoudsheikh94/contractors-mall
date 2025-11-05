import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContractorsList } from '@/components/supplier/customers/ContractorsList'

export const metadata = {
  title: 'العملاء - المقاول مول',
  description: 'إدارة العملاء والمقاولين'
}

export default async function CustomersPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get supplier profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, supplier_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'supplier_admin') {
    redirect('/auth/login')
  }

  if (!profile.supplier_id) {
    redirect('/supplier/setup')
  }

  // Fetch all contractors who have ordered from this supplier
  const { data: contractors, error: contractorsError } = await supabase
    .from('contractor_insights')
    .select(`
      contractor_id,
      total_orders,
      total_spent,
      average_order_value,
      last_order_date,
      days_since_last_order,
      orders_last_30_days,
      orders_last_90_days,
      completed_orders,
      disputed_orders,
      rejected_orders
    `)
    .eq('supplier_id', profile.supplier_id)
    .order('total_spent', { ascending: false })

  if (contractorsError) {
    console.error('Error fetching contractors:', contractorsError)
  }

  // Get contractor profiles
  const contractorIds = contractors?.map(c => c.contractor_id) || []

  const { data: contractorProfiles } = contractorIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .in('id', contractorIds)
    : { data: [] }

  // Merge insights with profiles
  const contractorsWithProfiles = contractors?.map(contractor => {
    const profile = contractorProfiles?.find(p => p.id === contractor.contractor_id)
    return {
      ...profile,
      insights: contractor
    }
  }).filter(c => c.id) || []

  // Calculate summary stats
  const stats = {
    totalContractors: contractorsWithProfiles.length,
    activeContractors: contractorsWithProfiles.filter(c =>
      c.insights.days_since_last_order !== null && c.insights.days_since_last_order < 30
    ).length,
    totalRevenue: contractors?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0,
    averageOrderValue: contractors && contractors.length > 0
      ? contractors.reduce((sum, c) => sum + (c.average_order_value || 0), 0) / contractors.length
      : 0
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">إدارة العملاء</h1>
          <p className="text-gray-600 mt-2">
            عرض وإدارة جميع المقاولين الذين طلبوا من متجرك
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">إجمالي العملاء</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalContractors}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">عملاء نشطون</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {stats.activeContractors}
                </p>
                <p className="text-xs text-gray-500 mt-1">آخر 30 يوم</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">إجمالي الإيرادات</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {stats.totalRevenue.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">دينار أردني</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">متوسط قيمة الطلب</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {stats.averageOrderValue.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">دينار أردني</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contractors List */}
        <ContractorsList
          initialContractors={contractorsWithProfiles}
          supplierId={profile.supplier_id}
        />
      </div>
    </div>
  )
}
