import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ContractorProfileCard } from '@/components/supplier/customers/ContractorProfileCard'
import { OrderHistoryTable } from '@/components/supplier/customers/OrderHistoryTable'
import { CategoryPreferences } from '@/components/supplier/customers/CategoryPreferences'
import { CommunicationHistory } from '@/components/supplier/customers/CommunicationHistory'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: 'ملف العميل - المقاول مول',
    description: 'عرض تفاصيل العميل والإحصائيات'
  }
}

export default async function ContractorProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const contractorId = params.id

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

  // Fetch contractor profile via API (uses the endpoint we built)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const response = await fetch(`${baseUrl}/api/supplier/contractors/${contractorId}`, {
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    if (response.status === 404) {
      notFound()
    }
    redirect('/supplier/customers')
  }

  const { contractor } = await response.json()

  // Verify this contractor has ordered from this supplier
  const { data: hasOrdered } = await supabase
    .from('orders')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('supplier_id', profile.supplier_id)
    .limit(1)
    .single()

  if (!hasOrdered) {
    redirect('/supplier/customers')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/supplier/customers" className="hover:text-primary-600">
            العملاء
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{contractor.full_name}</span>
        </nav>

        {/* Profile Card */}
        <div className="mb-6">
          <ContractorProfileCard contractor={contractor} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors flex items-center gap-2"
            onClick={() => {
              // Will be handled by client component
            }}
          >
            <span>📝</span>
            تسجيل تواصل
          </button>
          <Link
            href={`/supplier/customers/${contractorId}/orders`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
          >
            <span>📦</span>
            عرض جميع الطلبات
          </Link>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order History */}
          <div className="lg:col-span-2 space-y-6">
            <OrderHistoryTable contractorId={contractorId} supplierId={profile.supplier_id} />
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-6">
            {contractor.category_preferences && contractor.category_preferences.length > 0 && (
              <CategoryPreferences preferences={contractor.category_preferences} />
            )}

            <CommunicationHistory contractorId={contractorId} supplierId={profile.supplier_id} />
          </div>
        </div>
      </div>
    </div>
  )
}
