'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProductFormProps {
  supplierId: string
  categories: Array<{ id: string; name_ar: string; name_en: string }>
  product?: any // For editing existing product
}

export function ProductForm({ supplierId, categories, product }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    category_id: product?.category_id || '',
    name_ar: product?.name_ar || '',
    name_en: product?.name_en || '',
    description_ar: product?.description_ar || '',
    description_en: product?.description_en || '',
    unit_ar: product?.unit_ar || '',
    unit_en: product?.unit_en || '',
    price_per_unit: product?.price_per_unit?.toString() || '',
    min_order_quantity: product?.min_order_quantity?.toString() || '1',
    weight_kg_per_unit: product?.weight_kg_per_unit?.toString() || '',
    volume_m3_per_unit: product?.volume_m3_per_unit?.toString() || '',
    length_m_per_unit: product?.length_m_per_unit?.toString() || '',
    requires_open_bed: product?.requires_open_bed || false,
    stock_quantity: product?.stock_quantity?.toString() || '',
    is_available: product?.is_available !== undefined ? product.is_available : true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.sku || !formData.category_id || !formData.name_ar || !formData.unit_ar || !formData.price_per_unit) {
        setError('يرجى ملء جميع الحقول المطلوبة')
        setIsSubmitting(false)
        return
      }

      const supabase = createClient()

      const productData = {
        supplier_id: supplierId,
        category_id: formData.category_id,
        sku: formData.sku.trim(),
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en.trim() || formData.name_ar.trim(),
        description_ar: formData.description_ar.trim() || null,
        description_en: formData.description_en.trim() || null,
        unit_ar: formData.unit_ar.trim(),
        unit_en: formData.unit_en.trim() || formData.unit_ar.trim(),
        price_per_unit: parseFloat(formData.price_per_unit),
        min_order_quantity: parseFloat(formData.min_order_quantity) || 1,
        weight_kg_per_unit: formData.weight_kg_per_unit ? parseFloat(formData.weight_kg_per_unit) : null,
        volume_m3_per_unit: formData.volume_m3_per_unit ? parseFloat(formData.volume_m3_per_unit) : null,
        length_m_per_unit: formData.length_m_per_unit ? parseFloat(formData.length_m_per_unit) : null,
        requires_open_bed: formData.requires_open_bed,
        stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : null,
        is_available: formData.is_available,
      }

      if (product) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq('id', product.id)

        if (updateError) {
          console.error('Error updating product:', updateError)
          setError('فشل تحديث المنتج. يرجى المحاولة مرة أخرى.')
          setIsSubmitting(false)
          return
        }

        alert('✅ تم تحديث المنتج بنجاح!')
      } else {
        // Create new product
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData)

        if (insertError) {
          console.error('Error creating product:', insertError)

          // Check for duplicate SKU error
          if (insertError.code === '23505') {
            setError('رمز المنتج (SKU) موجود مسبقاً. يرجى استخدام رمز مختلف.')
          } else {
            setError('فشل إنشاء المنتج. يرجى المحاولة مرة أخرى.')
          }

          setIsSubmitting(false)
          return
        }

        alert('✅ تم إنشاء المنتج بنجاح!')
      }

      router.push('/supplier/products')
      router.refresh()
    } catch (err) {
      console.error('Error submitting product:', err)
      setError('حدث خطأ غير متوقع')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
            المعلومات الأساسية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز المنتج (SKU) *
              </label>
              <input
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="مثال: CEM-50KG-001"
                disabled={!!product} // Can't change SKU when editing
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التصنيف *
              </label>
              <select
                name="category_id"
                required
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">اختر التصنيف</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المنتج (عربي) *
              </label>
              <input
                type="text"
                name="name_ar"
                required
                value={formData.name_ar}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="مثال: أسمنت بورتلاندي"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المنتج (إنجليزي)
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Portland Cement"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وصف المنتج (عربي)
              </label>
              <textarea
                name="description_ar"
                value={formData.description_ar}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="وصف تفصيلي للمنتج..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وصف المنتج (إنجليزي)
              </label>
              <textarea
                name="description_en"
                value={formData.description_en}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Detailed product description..."
              />
            </div>
          </div>
        </div>

        {/* Pricing & Units */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
            السعر والوحدات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوحدة (عربي) *
              </label>
              <input
                type="text"
                name="unit_ar"
                required
                value={formData.unit_ar}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="مثال: كيس، طن، متر مكعب"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوحدة (إنجليزي)
              </label>
              <input
                type="text"
                name="unit_en"
                value={formData.unit_en}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., bag, ton, m³"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                السعر لكل وحدة (د.أ) *
              </label>
              <input
                type="number"
                name="price_per_unit"
                required
                step="0.01"
                min="0"
                value={formData.price_per_unit}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأدنى للطلب
              </label>
              <input
                type="number"
                name="min_order_quantity"
                step="0.01"
                min="0"
                value={formData.min_order_quantity}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المخزون المتاح
              </label>
              <input
                type="number"
                name="stock_quantity"
                step="0.01"
                min="0"
                value={formData.stock_quantity}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="اتركه فارغاً إذا كان غير محدد"
              />
              <p className="text-xs text-gray-500 mt-1">
                اترك فارغاً إذا كانت الكمية غير محدودة
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Dimensions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
            معلومات الشحن (لحساب نوع المركبة)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوزن لكل وحدة (كجم)
              </label>
              <input
                type="number"
                name="weight_kg_per_unit"
                step="0.001"
                min="0"
                value={formData.weight_kg_per_unit}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحجم لكل وحدة (م³)
              </label>
              <input
                type="number"
                name="volume_m3_per_unit"
                step="0.000001"
                min="0"
                value={formData.volume_m3_per_unit}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الطول لكل وحدة (م)
              </label>
              <input
                type="number"
                name="length_m_per_unit"
                step="0.001"
                min="0"
                value={formData.length_m_per_unit}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.000"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="requires_open_bed"
                checked={formData.requires_open_bed}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                يتطلب مركبة بصندوق مفتوح (قلاب)
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 mr-7">
              فعّل هذا الخيار للمواد الطويلة أو الضخمة
            </p>
          </div>
        </div>

        {/* Availability */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
            حالة التوفر
          </h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_available"
              checked={formData.is_available}
              onChange={handleChange}
              className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              المنتج متاح للطلب
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 mr-7">
            إلغاء التفعيل يخفي المنتج من العملاء
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
          >
            {isSubmitting ? 'جاري الحفظ...' : product ? 'حفظ التعديلات' : 'إنشاء المنتج'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/supplier/products')}
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold text-lg transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </form>
  )
}
