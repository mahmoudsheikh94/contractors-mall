import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getProduct(productId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(
        id,
        name_ar,
        name_en
      )
    `)
    .eq('id', productId)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  return data
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const product = await getProduct(params.id)

  if (!product) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          المنتج غير موجود
        </h2>
        <p className="text-gray-600 mb-6">
          لم نتمكن من العثور على المنتج المطلوب
        </p>
        <Link
          href="/supplier/products"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للمنتجات
        </Link>
      </div>
    )
  }

  const hasStock = product.stock_quantity !== null
  const isLowStock = hasStock && product.stock_quantity <= 10

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/supplier/products"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للمنتجات
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {product.name_ar}
            </h1>
            <p className="text-gray-600 mt-2">
              SKU: {product.sku}
            </p>
          </div>
          <Link
            href={`/supplier/products/${product.id}/edit`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            تعديل المنتج
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Status Banner */}
          {!product.is_available ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🚫</span>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    المنتج غير متاح
                  </h3>
                  <p className="text-red-800 text-sm">
                    هذا المنتج مخفي من العملاء ولن يظهر في نتائج البحث
                  </p>
                </div>
              </div>
            </div>
          ) : isLowStock ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                    مخزون منخفض
                  </h3>
                  <p className="text-yellow-800 text-sm">
                    المخزون المتبقي: {product.stock_quantity} {product.unit_ar}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Product Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              معلومات المنتج
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-600 block mb-1">التصنيف</label>
                <p className="font-semibold text-gray-900">{product.category.name_ar}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">رمز المنتج (SKU)</label>
                <p className="font-semibold text-gray-900">{product.sku}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">الاسم بالعربية</label>
                <p className="font-semibold text-gray-900">{product.name_ar}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">الاسم بالإنجليزية</label>
                <p className="font-semibold text-gray-900">{product.name_en || '-'}</p>
              </div>

              {product.description_ar && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600 block mb-1">الوصف (عربي)</label>
                  <p className="text-gray-900">{product.description_ar}</p>
                </div>
              )}

              {product.description_en && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600 block mb-1">الوصف (إنجليزي)</label>
                  <p className="text-gray-900">{product.description_en}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Information */}
          {(product.weight_kg_per_unit || product.volume_m3_per_unit || product.length_m_per_unit) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                معلومات الشحن
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {product.weight_kg_per_unit && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">الوزن لكل وحدة</label>
                    <p className="font-semibold text-gray-900">{product.weight_kg_per_unit} كجم</p>
                  </div>
                )}

                {product.volume_m3_per_unit && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">الحجم لكل وحدة</label>
                    <p className="font-semibold text-gray-900">{product.volume_m3_per_unit} م³</p>
                  </div>
                )}

                {product.length_m_per_unit && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">الطول لكل وحدة</label>
                    <p className="font-semibold text-gray-900">{product.length_m_per_unit} م</p>
                  </div>
                )}

                <div className="md:col-span-3">
                  <label className="text-sm text-gray-600 block mb-1">يتطلب مركبة مفتوحة</label>
                  <p className="font-semibold text-gray-900">
                    {product.requires_open_bed ? 'نعم' : 'لا'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Price & Stock */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              السعر والمخزون
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">السعر لكل وحدة</label>
                <p className="text-2xl font-bold text-primary-600">
                  {product.price_per_unit.toFixed(2)} د.أ
                </p>
                <p className="text-sm text-gray-600">لكل {product.unit_ar}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">الحد الأدنى للطلب</label>
                <p className="font-semibold text-gray-900">
                  {product.min_order_quantity} {product.unit_ar}
                </p>
              </div>

              {hasStock && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">المخزون المتاح</label>
                  <p className={`font-semibold text-2xl ${isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                    {product.stock_quantity} {product.unit_ar}
                  </p>
                </div>
              )}

              {!hasStock && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">المخزون</label>
                  <p className="font-semibold text-green-600">غير محدود</p>
                </div>
              )}
            </div>
          </div>

          {/* Units */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              الوحدات
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">الوحدة (عربي)</label>
                <p className="font-semibold text-gray-900">{product.unit_ar}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">الوحدة (إنجليزي)</label>
                <p className="font-semibold text-gray-900">{product.unit_en}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              الحالة
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">حالة التوفر</label>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                  product.is_available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.is_available ? 'متاح' : 'غير متاح'}
                </span>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">تاريخ الإنشاء</label>
                <p className="text-sm text-gray-900">
                  {new Date(product.created_at).toLocaleDateString('ar-JO')}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">آخر تحديث</label>
                <p className="text-sm text-gray-900">
                  {new Date(product.updated_at).toLocaleDateString('ar-JO')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
