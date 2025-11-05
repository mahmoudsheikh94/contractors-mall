import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { VehicleForm } from './VehicleForm'

async function getVehicles() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('display_order')

  if (error) {
    console.error('Error fetching vehicles:', error)
    return []
  }

  return data || []
}

export default async function VehiclesPage() {
  const vehicles = await getVehicles()

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
        <h1 className="text-3xl font-bold text-gray-900">إدارة المركبات</h1>
        <p className="text-gray-600 mt-2">إدارة أنواع المركبات وخصائصها لاختيار المركبة المناسبة للطلبات</p>
      </div>

      {/* Info Banner */}
      <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">كيف يتم استخدام المركبات؟</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• يتم اختيار المركبة تلقائياً بناءً على وزن وحجم وطول المنتجات في الطلب</li>
              <li>• يتم إضافة هامش الأمان المحدد في الإعدادات لضمان السعة الكافية</li>
              <li>• المركبات ذات الأسرّة المفتوحة مطلوبة للمنتجات الطويلة (&gt;4 متر)</li>
              <li>• ترتيب العرض يحدد أولوية المركبة في واجهة المستخدم</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add New Vehicle Form */}
      <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">إضافة مركبة جديدة</h2>
        <VehicleForm />
      </div>

      {/* Vehicles List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">المركبات الحالية ({vehicles.length})</h2>
        </div>

        {vehicles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-5xl mb-4">🚚</div>
            <p className="text-lg">لا توجد مركبات</p>
            <p className="text-sm text-gray-600 mt-2">أضف مركبة جديدة باستخدام النموذج أعلاه</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{vehicle.name_ar}</h3>
                      <span className="text-sm text-gray-600">({vehicle.name_en})</span>
                      {!vehicle.is_active && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          غير نشط
                        </span>
                      )}
                    </div>

                    {/* Specifications */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <label className="text-xs text-gray-600 block">رمز التصنيف</label>
                        <p className="text-sm font-mono text-gray-900">{vehicle.class_code}</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block">الحمولة القصوى</label>
                        <p className="text-sm font-semibold text-gray-900">{vehicle.max_weight_kg} كجم</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block">الحجم الأقصى</label>
                        <p className="text-sm font-semibold text-gray-900">{vehicle.max_volume_m3} م³</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block">الطول الأقصى</label>
                        <p className="text-sm font-semibold text-gray-900">{vehicle.max_length_m} م</p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">سرير مفتوح:</span>
                        <span className="font-semibold">
                          {vehicle.has_open_bed ? (
                            <span className="text-green-600">✓ نعم</span>
                          ) : (
                            <span className="text-gray-600">✗ لا</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">ترتيب العرض:</span>
                        <span className="font-semibold text-gray-900">{vehicle.display_order}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (placeholder for future edit/delete) */}
                  <div className="mr-4">
                    <span className={`inline-block w-3 h-3 rounded-full ${vehicle.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
