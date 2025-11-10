import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductForm } from '../../ProductForm'

async function getProduct(productId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  return data
}

async function getCategories() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .eq('is_active', true)
    .order('display_order')

  return data || []
}

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // Get current user and supplier info
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">خطأ: لم يتم العثور على حساب المورد</p>
      </div>
    )
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
        <a
          href="/supplier/products"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للمنتجات
        </a>
      </div>
    )
  }

  // Verify ownership
  if (product.supplier_id !== supplier.id) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          غير مصرح
        </h2>
        <p className="text-gray-600 mb-6">
          ليس لديك صلاحية لتعديل هذا المنتج
        </p>
        <a
          href="/supplier/products"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
        >
          العودة للمنتجات
        </a>
      </div>
    )
  }

  const categories = await getCategories()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <a
          href="/supplier/products"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          ← العودة للمنتجات
        </a>
        <h1 className="text-3xl font-bold text-gray-900">
          تعديل المنتج
        </h1>
        <p className="text-gray-600 mt-2">
          {product.name_ar} (SKU: {product.sku})
        </p>
      </div>

      <ProductForm
        supplierId={supplier.id}
        categories={categories}
        product={product}
      />
    </div>
  )
}
