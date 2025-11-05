import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ThresholdsForm } from './ThresholdsForm'

interface Thresholds {
  pin_threshold_jod: number
  site_visit_threshold_jod: number
  safety_margin_percentage: number
}

async function getThresholds(): Promise<Thresholds> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('settings')
    .select('*')
    .in('key', ['pin_threshold_jod', 'site_visit_threshold_jod', 'safety_margin_percentage'])

  const thresholds: Thresholds = {
    pin_threshold_jod: 120,
    site_visit_threshold_jod: 350,
    safety_margin_percentage: 10,
  }

  data?.forEach(setting => {
    const key = setting.key as keyof Thresholds
    thresholds[key] = Number(setting.value)
  })

  return thresholds
}

export default async function ThresholdsPage() {
  const thresholds = await getThresholds()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للإعدادات
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">العتبات والحدود</h1>
        <p className="text-gray-600 mt-2">إدارة حدود استخدام PIN، زيارات الموقع، وهامش الأمان</p>
      </div>

      {/* Info Banner */}
      <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">كيف تعمل العتبات؟</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>عتبة PIN:</strong> الطلبات التي تبلغ هذا المبلغ أو أكثر تتطلب رمز PIN للتوصيل</li>
              <li>• <strong>عتبة زيارة الموقع:</strong> النزاعات على طلبات بهذا المبلغ أو أكثر تتطلب زيارة ميدانية</li>
              <li>• <strong>هامش الأمان:</strong> نسبة إضافية لاختيار المركبة المناسبة (مثال: 10% تعني اختيار مركبة أكبر بـ 10%)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Values */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">عتبة PIN</h3>
          <p className="text-3xl font-bold text-primary-600">{thresholds.pin_threshold_jod} JOD</p>
          <p className="text-sm text-gray-600 mt-2">للطلبات ≥ هذا المبلغ</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">عتبة الزيارة الميدانية</h3>
          <p className="text-3xl font-bold text-primary-600">{thresholds.site_visit_threshold_jod} JOD</p>
          <p className="text-sm text-gray-600 mt-2">للنزاعات ≥ هذا المبلغ</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">هامش الأمان</h3>
          <p className="text-3xl font-bold text-primary-600">{thresholds.safety_margin_percentage}%</p>
          <p className="text-sm text-gray-600 mt-2">إضافة على سعة المركبة</p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">تعديل العتبات</h2>
        <ThresholdsForm initialValues={thresholds} />
      </div>
    </div>
  )
}
