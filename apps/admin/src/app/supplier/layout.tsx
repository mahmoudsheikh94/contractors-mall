import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupplierSidebar from '@/components/SupplierSidebar'
import { ResendEmailButton } from '@/components/ResendEmailButton'
import { NotificationPanel } from '@/components/NotificationPanel'

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Check if user is a supplier
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email_verified')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'supplier_admin') {
    redirect('/auth/login')
  }

  // Get supplier info
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('business_name, business_name_en, is_verified')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            خطأ في الحساب
          </h2>
          <p className="text-gray-600 mb-4">
            لم يتم العثور على حساب مورد مرتبط بهذا المستخدم.
          </p>
          <a
            href="/auth/register"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            التسجيل كمورد
          </a>
        </div>
      </div>
    )
  }

  if (!supplier?.is_verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            حسابك قيد المراجعة
          </h2>
          <p className="text-gray-600">
            سيتم مراجعة حسابك والتحقق من بياناتك قريباً. سنرسل لك إشعاراً عند تفعيل الحساب.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="flex h-screen">
        {/* Sidebar */}
        <SupplierSidebar
          businessName={supplier.business_name}
          userName={profile.full_name}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {supplier.business_name}
              </h2>
              <NotificationPanel />
            </div>
          </div>

          {/* Email Verification Warning Banner */}
          {!profile.email_verified && (
            <div className="bg-yellow-50 border-b-2 border-yellow-200 px-8 py-4">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                    يرجى تأكيد بريدك الإلكتروني
                  </h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    لتتمكن من قبول الطلبات وإدارة أعمالك بالكامل، يرجى تأكيد بريدك الإلكتروني من خلال الرابط المرسل إليك.
                  </p>
                  <div className="flex gap-3">
                    <ResendEmailButton />
                    <a
                      href={`mailto:${user.email}`}
                      className="text-sm text-yellow-700 hover:text-yellow-800 px-4 py-2 rounded-lg hover:bg-yellow-100 transition-colors font-medium"
                    >
                      فتح البريد الإلكتروني
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}