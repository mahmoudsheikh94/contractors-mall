import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductForm } from '../ProductForm'

async function getCategories() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .eq('is_active', true)
    .order('display_order')

  return data || []
}

export default async function NewProductPage() {
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
          إضافة منتج جديد
        </h1>
        <p className="text-gray-600 mt-2">
          أدخل معلومات المنتج الجديد
        </p>
      </div>

      <ProductForm
        supplierId={supplier.id}
        categories={categories}
      />
    </div>
  )
}
