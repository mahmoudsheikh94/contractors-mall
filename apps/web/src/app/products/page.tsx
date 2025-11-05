'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@contractors-mall/ui'
import { useCart } from '@/hooks/useCart'
import { CartButton } from '@/components/CartButton'

interface Category {
  id: string
  name_ar: string
  name_en: string
  slug: string
  children?: Category[]
}

interface Product {
  id: string
  sku: string
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  unit_ar: string
  unit_en: string
  price_per_unit: number
  min_order_quantity: number
  weight_kg_per_unit?: number | null
  volume_m3_per_unit?: number | null
  length_m_per_unit?: number | null
  requires_open_bed: boolean
  stock_quantity?: number
  supplier: {
    id: string
    business_name: string
    business_name_en: string
    rating_average: number
  }
  category: {
    id: string
    name_ar: string
    name_en: string
  }
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const supplierIdParam = searchParams?.get('supplierId')
  const { addItem, setIsOpen } = useCart()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>(supplierIdParam || '')
  const [searchTerm, setSearchTerm] = useState('')
  const [addedToCart, setAddedToCart] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (supplierIdParam) {
      setSelectedSupplier(supplierIdParam)
    }
  }, [supplierIdParam])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, selectedSupplier])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }

      if (selectedSupplier) {
        params.append('supplierId', selectedSupplier)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/products?${params.toString()}`)
      const data = await response.json()

      if (data.products) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      unit_ar: product.unit_ar,
      unit_en: product.unit_en,
      price_per_unit: product.price_per_unit,
      min_order_quantity: product.min_order_quantity,
      weight_kg_per_unit: product.weight_kg_per_unit,
      volume_m3_per_unit: product.volume_m3_per_unit,
      length_m_per_unit: product.length_m_per_unit,
      requires_open_bed: product.requires_open_bed,
      supplier: {
        id: product.supplier.id,
        business_name: product.supplier.business_name,
        business_name_en: product.supplier.business_name_en,
      },
    })

    // Show feedback
    setAddedToCart(product.id)
    setTimeout(() => setAddedToCart(null), 2000)

    // Open cart drawer
    setIsOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
              {selectedSupplier && (
                <p className="mt-1 text-sm text-gray-600">
                  عرض منتجات مورد محدد
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <CartButton />
              <Link href="/suppliers">
                <Button variant="outline" size="sm">
                  عرض الموردين
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  الرئيسية
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <Button type="submit" variant="primary">
                بحث
              </Button>
            </div>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar - Categories */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">التصنيفات</h2>

              {/* All Products */}
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-right px-4 py-2 rounded-md mb-2 transition-colors ${
                  selectedCategory === ''
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                جميع المنتجات
              </button>

              {/* Category List */}
              <div className="space-y-1">
                {categories.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-right px-4 py-2 rounded-md transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {category.name_ar}
                    </button>

                    {/* Sub-categories */}
                    {category.children && category.children.length > 0 && (
                      <div className="mr-4 mt-1 space-y-1">
                        {category.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => setSelectedCategory(child.id)}
                            className={`w-full text-right px-4 py-2 rounded-md text-sm transition-colors ${
                              selectedCategory === child.id
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {child.name_ar}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Clear Filters */}
              {(selectedCategory || selectedSupplier) && (
                <button
                  onClick={() => {
                    setSelectedCategory('')
                    setSelectedSupplier('')
                  }}
                  className="w-full mt-4 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  إزالة جميع الفلاتر
                </button>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <main className="mt-6 lg:mt-0 lg:col-span-9">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-gray-600">جاري التحميل...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  لا توجد منتجات
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  لم يتم العثور على منتجات متاحة
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  عرض {products.length} منتج
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        {/* Product Info */}
                        <div>
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-medium text-gray-900 flex-1">
                              {product.name_ar}
                            </h3>
                            <span className="mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {product.category.name_ar}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {product.name_en}
                          </p>
                        </div>

                        {/* Description */}
                        {product.description_ar && (
                          <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                            {product.description_ar}
                          </p>
                        )}

                        {/* Supplier */}
                        <div className="mt-3 flex items-center text-sm text-gray-600">
                          <svg
                            className="ml-1.5 h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          <span>{product.supplier.business_name}</span>
                          {product.supplier.rating_average > 0 && (
                            <>
                              <svg
                                className="mr-2 h-4 w-4 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs">
                                {product.supplier.rating_average.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Specs */}
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          {product.weight_kg_per_unit && (
                            <div className="text-gray-600">
                              <span className="font-medium">الوزن:</span>{' '}
                              {product.weight_kg_per_unit} كجم
                            </div>
                          )}
                          {product.volume_m3_per_unit && (
                            <div className="text-gray-600">
                              <span className="font-medium">الحجم:</span>{' '}
                              {product.volume_m3_per_unit} م³
                            </div>
                          )}
                        </div>

                        {/* Price & Add to Cart */}
                        <div className="mt-6 flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-primary-600">
                              {product.price_per_unit.toFixed(2)} د.أ
                            </div>
                            <div className="text-sm text-gray-500">
                              لكل {product.unit_ar}
                            </div>
                            {product.min_order_quantity > 1 && (
                              <div className="text-xs text-gray-500 mt-1">
                                الحد الأدنى: {product.min_order_quantity}{' '}
                                {product.unit_ar}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAddToCart(product)}
                          >
                            {addedToCart === product.id ? '✓ تمت الإضافة' : 'أضف للسلة'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
      <ProductsContent />
    </Suspense>
  )
}
