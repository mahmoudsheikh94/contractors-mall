import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'المناطق والرسوم - المقاول مول',
  description: 'إدارة مناطق التوصيل ورسوم الشحن'
}

export default async function SupplierZonesPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">المناطق والرسوم</h1>
          <p className="text-gray-600 mt-2">
            إدارة مناطق التوصيل ورسوم الشحن الخاصة بك
          </p>
        </div>

        {/* Current Zones */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">المناطق الحالية</h2>
          </div>

          <div className="space-y-4">
            {/* Zone A */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">منطقة أ (Zone A)</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  نشطة
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                المناطق القريبة من موقع المستودع (أقل من {supplier.zone_a_radius_km || 10} كم)
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">نصف القطر:</span>
                  <span className="font-medium text-gray-900 mr-2">
                    {supplier.zone_a_radius_km || 10} كم
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">رسوم التوصيل:</span>
                  <span className="font-medium text-gray-900 mr-2">
                    {supplier.zone_a_fee_jod?.toFixed(2) || '3.00'} د.أ
                  </span>
                </div>
              </div>
            </div>

            {/* Zone B */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">منطقة ب (Zone B)</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  نشطة
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                المناطق المتوسطة البعد ({supplier.zone_a_radius_km || 10} - {supplier.zone_b_radius_km || 25} كم)
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">نصف القطر:</span>
                  <span className="font-medium text-gray-900 mr-2">
                    {supplier.zone_b_radius_km || 25} كم
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">رسوم التوصيل:</span>
                  <span className="font-medium text-gray-900 mr-2">
                    {supplier.zone_b_fee_jod?.toFixed(2) || '5.00'} د.أ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warehouse Location */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">موقع المستودع</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                العنوان
              </label>
              <p className="text-gray-900">
                {supplier.warehouse_address || 'لم يتم تحديد العنوان'}
              </p>
            </div>

            {supplier.warehouse_lat && supplier.warehouse_lng && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    خط العرض
                  </label>
                  <p className="text-gray-900" dir="ltr">{supplier.warehouse_lat}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    خط الطول
                  </label>
                  <p className="text-gray-900" dir="ltr">{supplier.warehouse_lng}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zone Calculation Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">كيف يتم حساب المناطق؟</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="text-primary-600 ml-3 mt-0.5">●</span>
              <p>
                يتم حساب المناطق بناءً على المسافة بين موقع مستودعك وموقع التوصيل المطلوب
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-primary-600 ml-3 mt-0.5">●</span>
              <p>
                <strong>منطقة أ:</strong> للطلبات القريبة (أقل من {supplier.zone_a_radius_km || 10} كم)
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-primary-600 ml-3 mt-0.5">●</span>
              <p>
                <strong>منطقة ب:</strong> للطلبات متوسطة البعد (من {supplier.zone_a_radius_km || 10} إلى {supplier.zone_b_radius_km || 25} كم)
              </p>
            </div>
            <div className="flex items-start">
              <span className="text-primary-600 ml-3 mt-0.5">●</span>
              <p>
                يتم عرض رسوم التوصيل تلقائياً للعميل قبل إتمام الطلب
              </p>
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
                لتعديل أنصاف الأقطار أو رسوم التوصيل، يرجى التواصل مع إدارة المنصة.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
