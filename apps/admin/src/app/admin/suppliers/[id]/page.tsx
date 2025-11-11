import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { VerifySupplierButton } from './VerifySupplierButton'

async function getSupplierDetails(id: string) {
  const supabase = await createClient()

  const { data: supplier, error } = (await supabase
    .from('suppliers')
    .select(`
      *,
      owner:profiles!owner_id(
        id,
        full_name,
        email,
        phone,
        created_at
      )
    `)
    .eq('id', id)
    .single()) as any

  if (error) {
    console.error('Error fetching supplier:', error)
    return null
  }

  // Get products count
  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', id)

  // Get orders count
  const { count: ordersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', id)

  return {
    ...supplier,
    productsCount: productsCount || 0,
    ordersCount: ordersCount || 0,
  }
}

export default async function SupplierDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const supplier = await getSupplierDetails(params.id)

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          المورد غير موجود
        </h2>
        <Link
          href="/admin/suppliers"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للموردين
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للموردين
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {supplier.business_name}
            </h1>
            <p className="text-gray-600 mt-2">تفاصيل المورد ومعلومات التوثيق</p>
          </div>
          {supplier.is_verified ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              <span className="text-xl">✓</span>
              <span className="font-semibold">موثق</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
              <span className="text-xl">⏳</span>
              <span className="font-semibold">بانتظار التوثيق</span>
            </div>
          )}
        </div>
      </div>

      {/* Verification Actions */}
      {!supplier.is_verified && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            إجراءات التوثيق
          </h3>
          <p className="text-yellow-800 mb-4">
            يرجى مراجعة معلومات المورد أدناه. بعد التحقق من صحة البيانات، يمكنك توثيق المورد للسماح له بالبدء في استخدام المنصة.
          </p>
          <VerifySupplierButton supplierId={supplier.id} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات المنشأة</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">اسم المنشأة (عربي)</label>
                <p className="font-semibold text-gray-900">{supplier.business_name}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">اسم المنشأة (إنجليزي)</label>
                <p className="font-semibold text-gray-900">{supplier.business_name_en || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">رقم الهاتف</label>
                <p className="font-semibold text-gray-900">{supplier.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">البريد الإلكتروني</label>
                <p className="font-semibold text-gray-900">{supplier.email || '-'}</p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">العنوان</label>
                <p className="font-semibold text-gray-900">{supplier.address}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">خط العرض</label>
                <p className="font-semibold text-gray-900">{supplier.latitude}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">خط الطول</label>
                <p className="font-semibold text-gray-900">{supplier.longitude}</p>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">معلومات المالك</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">الاسم الكامل</label>
                <p className="font-semibold text-gray-900">{supplier.owner?.full_name}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">البريد الإلكتروني</label>
                <p className="font-semibold text-gray-900">{supplier.owner?.email}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">رقم الهاتف</label>
                <p className="font-semibold text-gray-900">{supplier.owner?.phone}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">تاريخ إنشاء الحساب</label>
                <p className="font-semibold text-gray-900">
                  {new Date(supplier.owner?.created_at).toLocaleDateString('ar-JO')}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Zones */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">مناطق التوصيل</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">نطاق المنطقة A</label>
                <p className="font-semibold text-gray-900">{supplier.radius_km_zone_a} كم</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">نطاق المنطقة B</label>
                <p className="font-semibold text-gray-900">{supplier.radius_km_zone_b} كم</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">الإحصائيات</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">عدد المنتجات</label>
                <p className="text-2xl font-bold text-primary-600">{supplier.productsCount}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">عدد الطلبات</label>
                <p className="text-2xl font-bold text-primary-600">{supplier.ordersCount}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">التقييم</label>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-primary-600">
                    {supplier.rating_average > 0 ? supplier.rating_average.toFixed(1) : '-'}
                  </p>
                  {supplier.rating_count > 0 && (
                    <p className="text-sm text-gray-600">({supplier.rating_count} تقييم)</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Wallet */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">المحفظة</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">الرصيد الكلي</label>
                <p className="text-2xl font-bold text-gray-900">{supplier.wallet_balance.toFixed(2)} JOD</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">معلق</label>
                <p className="text-lg font-semibold text-yellow-600">{supplier.wallet_pending.toFixed(2)} JOD</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">متاح</label>
                <p className="text-lg font-semibold text-green-600">{supplier.wallet_available.toFixed(2)} JOD</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">الحالة</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">تاريخ التسجيل</label>
                <p className="text-sm text-gray-900">
                  {new Date(supplier.created_at).toLocaleString('ar-JO')}
                </p>
              </div>

              {supplier.verified_at && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">تاريخ التوثيق</label>
                  <p className="text-sm text-gray-900">
                    {new Date(supplier.verified_at).toLocaleString('ar-JO')}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-600 block mb-1">آخر تحديث</label>
                <p className="text-sm text-gray-900">
                  {new Date(supplier.updated_at).toLocaleString('ar-JO')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
