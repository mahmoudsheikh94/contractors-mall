import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'الملف التجاري - المقاول مول',
  description: 'إدارة معلومات الملف التجاري'
}

export default async function SupplierProfilePage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get supplier info
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          خطأ: لم يتم العثور على حساب المورد
        </h2>
        <p className="text-gray-600 mb-6">
          لم نتمكن من العثور على بيانات المورد المرتبطة بحسابك
        </p>
      </div>
    )
  }

  // Get profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">الملف التجاري</h1>
          <p className="text-gray-600 mt-2">
            معلومات ملفك التجاري على منصة المقاول مول
          </p>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات الشركة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم التجاري
              </label>
              <p className="text-gray-900">{supplier.business_name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم السجل التجاري
              </label>
              <p className="text-gray-900">{supplier.license_number || 'غير محدد'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الرقم الضريبي
              </label>
              <p className="text-gray-900">{supplier.tax_number || 'غير محدد'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                حالة الحساب
              </label>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  supplier.is_verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {supplier.is_verified ? 'موافق عليه' : 'قيد المراجعة'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات الاتصال</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <p className="text-gray-900">{profile?.email || user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف
              </label>
              <p className="text-gray-900" dir="ltr">{profile?.phone || 'غير محدد'}</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                العنوان
              </label>
              <p className="text-gray-900">{supplier.address || 'غير محدد'}</p>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">إعدادات الحساب</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <h3 className="font-medium text-gray-900">تأكيد البريد الإلكتروني</h3>
                <p className="text-sm text-gray-600">
                  {user.email_confirmed_at
                    ? 'تم تأكيد البريد الإلكتروني'
                    : 'لم يتم تأكيد البريد الإلكتروني بعد'}
                </p>
              </div>
              {user.email_confirmed_at ? (
                <span className="text-green-600 text-xl">✓</span>
              ) : (
                <span className="text-yellow-600 text-xl">⚠️</span>
              )}
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-gray-900">تاريخ الانضمام</h3>
                <p className="text-sm text-gray-600">
                  {new Date(supplier.created_at).toLocaleDateString('ar-JO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-2xl ml-3">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">ملاحظة</h3>
              <p className="text-sm text-blue-800">
                لتعديل معلومات ملفك التجاري، يرجى التواصل مع إدارة المنصة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
