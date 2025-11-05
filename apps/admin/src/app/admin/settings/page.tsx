import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function getSettings() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('settings')
    .select('*')
    .in('key', ['pin_threshold_jod', 'site_visit_threshold_jod', 'safety_margin_percentage', 'platform_commission_percentage'])

  const settings: Record<string, any> = {}
  data?.forEach(setting => {
    settings[setting.key] = setting.value
  })

  return settings
}

async function getVehiclesCount() {
  const supabase = await createClient()
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
  return count || 0
}

export default async function SettingsPage() {
  const settings = await getSettings()
  const vehiclesCount = await getVehiclesCount()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إعدادات النظام</h1>
        <p className="text-gray-600 mt-2">إدارة إعدادات المنصة والعتبات والرسوم</p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Thresholds */}
        <Link
          href="/admin/settings/thresholds"
          className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-600"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">العتبات والحدود</h3>
            <span className="text-3xl">⚡</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            إدارة حدود استخدام PIN، زيارات الموقع، وهامش الأمان
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">عتبة PIN:</span>
              <span className="font-semibold">{settings.pin_threshold_jod || 120} JOD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">عتبة الزيارة:</span>
              <span className="font-semibold">{settings.site_visit_threshold_jod || 350} JOD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">هامش الأمان:</span>
              <span className="font-semibold">{settings.safety_margin_percentage || 10}%</span>
            </div>
          </div>
          <div className="mt-4 text-primary-600 font-semibold text-sm">
            تعديل ←
          </div>
        </Link>

        {/* Vehicles */}
        <Link
          href="/admin/settings/vehicles"
          className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-600"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">المركبات</h3>
            <span className="text-3xl">🚚</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            إدارة أنواع المركبات وسعتها وخصائصها
          </p>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-primary-600">{vehiclesCount}</p>
            <p className="text-sm text-gray-600 mt-1">نوع مركبة</p>
          </div>
          <div className="mt-4 text-primary-600 font-semibold text-sm">
            إدارة المركبات ←
          </div>
        </Link>

        {/* Commission & Fees */}
        <Link
          href="/admin/settings/commission"
          className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-600"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">العمولة والرسوم</h3>
            <span className="text-3xl">💵</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            إدارة عمولة المنصة ورسوم التوصيل الافتراضية
          </p>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-primary-600">
              {settings.platform_commission_percentage || 5}%
            </p>
            <p className="text-sm text-gray-600 mt-1">عمولة المنصة</p>
          </div>
          <div className="mt-4 text-primary-600 font-semibold text-sm">
            تعديل ←
          </div>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">ملاحظات مهمة</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• التغييرات في الإعدادات تؤثر على الطلبات الجديدة فقط</li>
              <li>• الطلبات القديمة تحتفظ بالإعدادات التي كانت سارية وقت إنشائها</li>
              <li>• يتم تسجيل جميع التغييرات في سجل النظام</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
