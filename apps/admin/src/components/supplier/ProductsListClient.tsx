'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BulkEditModal } from './BulkEditModal'

interface Product {
  id: string
  sku: string
  name_ar: string
  name_en: string
  price_per_unit: number
  stock_quantity: number | null
  min_order_quantity: number
  unit_ar: string
  is_available: boolean
  category: {
    name_ar: string
  }
}

interface ProductsListClientProps {
  products: Product[]
  supplierId: string
}

export function ProductsListClient({ products, supplierId }: ProductsListClientProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const handleBulkEditComplete = () => {
    setSelectedProducts([])
    setShowBulkEditModal(false)
    // Refresh page to show updated products
    window.location.reload()
  }

  return (
    <div>
      {/* Selection Actions Bar */}
      {selectedProducts.length > 0 && (
        <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-primary-900">
              {selectedProducts.length} منتج محدد
            </span>
            <button
              onClick={() => setSelectedProducts([])}
              className="text-sm text-primary-700 hover:text-primary-800 underline"
            >
              إلغاء التحديد
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              ✏️ تعديل الكل
            </button>
          </div>
        </div>
      )}

      {/* Select All Checkbox */}
      {products.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-t-lg p-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedProducts.length === products.length && products.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">
            تحديد الكل ({products.length})
          </span>
        </div>
      )}

      {/* Products List */}
      <div className="divide-y divide-gray-200 border border-gray-200 border-t-0">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isSelected={selectedProducts.includes(product.id)}
            onToggle={() => toggleProduct(product.id)}
          />
        ))}
      </div>

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          selectedProductIds={selectedProducts}
          supplierId={supplierId}
          onClose={() => setShowBulkEditModal(false)}
          onComplete={handleBulkEditComplete}
        />
      )}
    </div>
  )
}

function ProductCard({
  product,
  isSelected,
  onToggle,
}: {
  product: Product
  isSelected: boolean
  onToggle: () => void
}) {
  const [duplicating, setDuplicating] = useState(false)
  const hasStock = product.stock_quantity !== null
  const isLowStock = hasStock && product.stock_quantity <= 10

  const handleDuplicate = async () => {
    if (!confirm(`هل تريد إنشاء نسخة من المنتج "${product.name_ar}"؟`)) {
      return
    }

    try {
      setDuplicating(true)

      const response = await fetch(`/api/supplier/products/${product.id}/duplicate`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'فشل النسخ')
      }

      alert(result.message || 'تم إنشاء نسخة بنجاح')

      // Redirect to edit page of duplicated product
      window.location.href = `/supplier/products/${result.product.id}/edit`
    } catch (error: any) {
      console.error('Duplicate error:', error)
      alert(error.message || 'حدث خطأ أثناء النسخ')
      setDuplicating(false)
    }
  }

  return (
    <div className={`p-6 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />

        <div className="flex-1">
          {/* Product Name & SKU */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {product.name_ar}
            </h3>
            {!product.is_available && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                غير متاح
              </span>
            )}
            {isLowStock && product.is_available && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                مخزون منخفض
              </span>
            )}
          </div>

          {/* Category & SKU */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <span>🏷️</span>
              <span>SKU: {product.sku}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📁</span>
              <span>{product.category.name_ar}</span>
            </div>
          </div>

          {/* Price & Stock */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">السعر:</span>
              <span className="font-semibold text-gray-900">
                {product.price_per_unit.toFixed(2)} د.أ / {product.unit_ar}
              </span>
            </div>
            {hasStock && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">المخزون:</span>
                <span className={`font-semibold ${isLowStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {product.stock_quantity} {product.unit_ar}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-600">الحد الأدنى:</span>
              <span className="font-semibold text-gray-900">
                {product.min_order_quantity} {product.unit_ar}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="نسخ المنتج"
          >
            {duplicating ? '...' : '📋'}
          </button>
          <Link
            href={`/supplier/products/${product.id}/edit`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
          >
            تعديل
          </Link>
          <Link
            href={`/supplier/products/${product.id}`}
            className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
          >
            عرض
          </Link>
        </div>
      </div>
    </div>
  )
}
