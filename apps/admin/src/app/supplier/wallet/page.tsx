import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'المحفظة | Wallet - Contractors Mall',
  description: 'عرض رصيد المحفظة والمعاملات المالية'
}

export default async function SupplierWalletPage() {
  const supabase = await createClient()

  // 1. Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // 2. Verify supplier role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'supplier_admin') {
    redirect('/dashboard')
  }

  // 3. Get supplier details
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name')
    .eq('id', user.id)
    .single()

  if (!supplier) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            المحفظة المالية
          </h1>
          <p className="text-gray-600 mt-2">
            عرض الرصيد والمعاملات المالية
          </p>
        </div>

        {/* Placeholder - Coming Soon */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            قريباً - الم حفظة المالية
          </h2>
          <p className="text-gray-600 mb-6">
            سيتم إضافة صفحة المحفظة المالية قريباً. حالياً يمكنك متابعة معاملاتك المالية من خلال صفحات الطلبات.
          </p>
          <a
            href="/supplier/orders"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            عرض الطلبات
          </a>
        </div>
      </div>
    </div>
  )
}
