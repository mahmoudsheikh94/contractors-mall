'use client'

import { useState } from 'react'

interface BulkEditModalProps {
  selectedProductIds: string[]
  supplierId: string
  onClose: () => void
  onComplete: () => void
}

type PriceAction = 'increase_percent' | 'decrease_percent' | 'set_fixed'
type StockAction = 'set' | 'add' | 'subtract'

export function BulkEditModal({
  selectedProductIds,
  supplierId,
  onClose,
  onComplete,
}: BulkEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Price fields
  const [updatePrice, setUpdatePrice] = useState(false)
  const [priceAction, setPriceAction] = useState<PriceAction>('increase_percent')
  const [priceValue, setPriceValue] = useState('')

  // Stock fields
  const [updateStock, setUpdateStock] = useState(false)
  const [stockAction, setStockAction] = useState<StockAction>('add')
  const [stockValue, setStockValue] = useState('')

  // Availability fields
  const [updateAvailability, setUpdateAvailability] = useState(false)
  const [availability, setAvailability] = useState(true)

  // Min order quantity fields
  const [updateMinOrder, setUpdateMinOrder] = useState(false)
  const [minOrderValue, setMinOrderValue] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const updates: any = {}

      if (updatePrice && priceValue) {
        updates.price = {
          action: priceAction,
          value: parseFloat(priceValue),
        }
      }

      if (updateStock && stockValue) {
        updates.stock = {
          action: stockAction,
          value: parseInt(stockValue),
        }
      }

      if (updateAvailability) {
        updates.availability = availability
      }

      if (updateMinOrder && minOrderValue) {
        updates.min_order_quantity = parseInt(minOrderValue)
      }

      // Validate at least one update is selected
      if (Object.keys(updates).length === 0) {
        setError('الرجاء تحديد حقل واحد على الأقل للتحديث')
        setLoading(false)
        return
      }

      const response = await fetch('/api/supplier/products/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId,
          productIds: selectedProductIds,
          updates,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'فشل التحديث الجماعي')
      }

      alert(`تم تحديث ${result.updated} منتج بنجاح`)
      onComplete()
    } catch (error: any) {
      console.error('Bulk update error:', error)
      setError(error.message || 'حدث خطأ أثناء التحديث')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">تعديل جماعي</h2>
              <p className="text-sm text-gray-600 mt-1">
                تعديل {selectedProductIds.length} منتج
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Price Update */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="updatePrice"
                checked={updatePrice}
                onChange={(e) => setUpdatePrice(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="updatePrice" className="font-semibold text-gray-900">
                💰 تحديث السعر
              </label>
            </div>

            {updatePrice && (
              <div className="mr-7 space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priceAction"
                      value="increase_percent"
                      checked={priceAction === 'increase_percent'}
                      onChange={(e) => setPriceAction(e.target.value as PriceAction)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">زيادة بنسبة %</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priceAction"
                      value="decrease_percent"
                      checked={priceAction === 'decrease_percent'}
                      onChange={(e) => setPriceAction(e.target.value as PriceAction)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">تخفيض بنسبة %</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priceAction"
                      value="set_fixed"
                      checked={priceAction === 'set_fixed'}
                      onChange={(e) => setPriceAction(e.target.value as PriceAction)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">تعيين سعر ثابت</span>
                  </label>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder={priceAction === 'set_fixed' ? 'السعر الجديد (د.أ)' : 'النسبة المئوية'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required={updatePrice}
                />
              </div>
            )}
          </div>

          {/* Stock Update */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="updateStock"
                checked={updateStock}
                onChange={(e) => setUpdateStock(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="updateStock" className="font-semibold text-gray-900">
                📦 تحديث المخزون
              </label>
            </div>

            {updateStock && (
              <div className="mr-7 space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="stockAction"
                      value="set"
                      checked={stockAction === 'set'}
                      onChange={(e) => setStockAction(e.target.value as StockAction)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">تعيين</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="stockAction"
                      value="add"
                      checked={stockAction === 'add'}
                      onChange={(e) => setStockAction(e.target.value as StockAction)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">إضافة</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="stockAction"
                      value="subtract"
                      checked={stockAction === 'subtract'}
                      onChange={(e) => setStockAction(e.target.value as StockAction)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">طرح</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  placeholder="الكمية"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required={updateStock}
                />
              </div>
            )}
          </div>

          {/* Availability Update */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="updateAvailability"
                checked={updateAvailability}
                onChange={(e) => setUpdateAvailability(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="updateAvailability" className="font-semibold text-gray-900">
                ✅ تحديث التوفر
              </label>
            </div>

            {updateAvailability && (
              <div className="mr-7 space-y-2 bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="availability"
                    checked={availability === true}
                    onChange={() => setAvailability(true)}
                    className="text-primary-600"
                  />
                  <span className="text-sm">متاح</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="availability"
                    checked={availability === false}
                    onChange={() => setAvailability(false)}
                    className="text-primary-600"
                  />
                  <span className="text-sm">غير متاح</span>
                </label>
              </div>
            )}
          </div>

          {/* Min Order Quantity Update */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="updateMinOrder"
                checked={updateMinOrder}
                onChange={(e) => setUpdateMinOrder(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="updateMinOrder" className="font-semibold text-gray-900">
                🔢 تحديث الحد الأدنى للطلب
              </label>
            </div>

            {updateMinOrder && (
              <div className="mr-7 bg-gray-50 p-4 rounded-lg">
                <input
                  type="number"
                  min="1"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="الحد الأدنى للطلب"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required={updateMinOrder}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التحديث...' : `تحديث ${selectedProductIds.length} منتج`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
