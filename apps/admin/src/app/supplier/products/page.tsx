import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { QuickActionsPanel } from '@/components/supplier/QuickActionsPanel'
import { ProductsListClient } from '@/components/supplier/ProductsListClient'

async function getProducts(supplierId: string, filter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(
        id,
        name_ar,
        name_en
      )
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter === 'available') {
    query = query.eq('is_available', true)
  } else if (filter === 'unavailable') {
    query = query.eq('is_available', false)
  } else if (filter === 'low_stock') {
    query = query.lte('stock_quantity', 10)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data || []
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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
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

  const products = await getProducts(supplier.id, searchParams.filter)
  const categories = await getCategories()

  // Calculate stats
  const stats = {
    total: products.length,
    available: products.filter(p => p.is_available).length,
    unavailable: products.filter(p => !p.is_available).length,
    lowStock: products.filter(p => p.stock_quantity !== null && p.stock_quantity <= 10).length,
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            إدارة المنتجات
          </h1>
          <p className="text-gray-600 mt-2">
            عرض وإدارة جميع منتجاتك
          </p>
        </div>
        <Link
          href="/supplier/products/new"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
        >
          + إضافة منتج جديد
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📦</span>
            <span className="text-sm text-gray-600">إجمالي</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">منتج</div>
        </div>

        <div className="bg-green-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">✅</span>
            <span className="text-sm text-green-600">متاح</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.available}</div>
          <div className="text-sm text-green-700">منتج متاح</div>
        </div>

        <div className="bg-red-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🚫</span>
            <span className="text-sm text-red-600">غير متاح</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.unavailable}</div>
          <div className="text-sm text-red-700">منتج غير متاح</div>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">⚠️</span>
            <span className="text-sm text-yellow-600">مخزون منخفض</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">{stats.lowStock}</div>
          <div className="text-sm text-yellow-700">منتج</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <QuickActionsPanel supplierId={supplier.id} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <FilterButton
              href="/supplier/products"
              label="الكل"
              active={!searchParams.filter}
            />
            <FilterButton
              href="/supplier/products?filter=available"
              label="متاح"
              active={searchParams.filter === 'available'}
            />
            <FilterButton
              href="/supplier/products?filter=unavailable"
              label="غير متاح"
              active={searchParams.filter === 'unavailable'}
            />
            <FilterButton
              href="/supplier/products?filter=low_stock"
              label="مخزون منخفض"
              active={searchParams.filter === 'low_stock'}
            />
          </div>
        </div>

        {/* Products List */}
        {products.length > 0 ? (
          <ProductsListClient products={products} supplierId={supplier.id} />
        ) : (
          <div className="p-12 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-4 text-gray-600 mb-6">لا توجد منتجات</p>
            <Link
              href="/supplier/products/new"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              + إضافة منتج جديد
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </Link>
  )
}
