'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function VehicleForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    class_code: '',
    max_weight_kg: '',
    max_volume_m3: '',
    max_length_m: '',
    has_open_bed: false,
    display_order: '0',
    is_active: true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      // Validate
      if (!formData.name_ar || !formData.name_en || !formData.class_code) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة')
      }

      if (parseFloat(formData.max_weight_kg) <= 0 || parseFloat(formData.max_volume_m3) <= 0 || parseFloat(formData.max_length_m) <= 0) {
        throw new Error('القيم يجب أن تكون أكبر من صفر')
      }

      const supabase = createClient()

      const { error: insertError } = await supabase
        .from('vehicles')
        .insert({
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim(),
          class_code: formData.class_code.trim().toLowerCase().replace(/\s+/g, '_'),
          max_weight_kg: parseFloat(formData.max_weight_kg),
          max_volume_m3: parseFloat(formData.max_volume_m3),
          max_length_m: parseFloat(formData.max_length_m),
          has_open_bed: formData.has_open_bed,
          display_order: parseInt(formData.display_order) || 0,
          is_active: formData.is_active,
        })

      if (insertError) throw insertError

      setSuccess(true)
      setFormData({
        name_ar: '',
        name_en: '',
        class_code: '',
        max_weight_kg: '',
        max_volume_m3: '',
        max_length_m: '',
        has_open_bed: false,
        display_order: '0',
        is_active: true,
      })

      router.refresh()
    } catch (err: any) {
      console.error('Error adding vehicle:', err)
      setError(err.message || 'فشل إضافة المركبة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          ✓ تمت إضافة المركبة بنجاح!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Names */}
        <div>
          <label htmlFor="name_ar" className="block text-sm font-semibold text-gray-700 mb-2">
            الاسم (عربي) *
          </label>
          <input
            type="text"
            id="name_ar"
            name="name_ar"
            value={formData.name_ar}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="مثال: وانيت 1 طن"
          />
        </div>

        <div>
          <label htmlFor="name_en" className="block text-sm font-semibold text-gray-700 mb-2">
            الاسم (إنجليزي) *
          </label>
          <input
            type="text"
            id="name_en"
            name="name_en"
            value={formData.name_en}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Pickup 1 Ton"
          />
        </div>

        <div>
          <label htmlFor="class_code" className="block text-sm font-semibold text-gray-700 mb-2">
            رمز التصنيف *
          </label>
          <input
            type="text"
            id="class_code"
            name="class_code"
            value={formData.class_code}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="pickup_1t"
          />
          <p className="text-xs text-gray-600 mt-1">سيتم تحويله إلى lowercase</p>
        </div>

        {/* Specifications */}
        <div>
          <label htmlFor="max_weight_kg" className="block text-sm font-semibold text-gray-700 mb-2">
            الحمولة القصوى (كجم) *
          </label>
          <input
            type="number"
            id="max_weight_kg"
            name="max_weight_kg"
            value={formData.max_weight_kg}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="1000"
          />
        </div>

        <div>
          <label htmlFor="max_volume_m3" className="block text-sm font-semibold text-gray-700 mb-2">
            الحجم الأقصى (م³) *
          </label>
          <input
            type="number"
            id="max_volume_m3"
            name="max_volume_m3"
            value={formData.max_volume_m3}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="4.5"
          />
        </div>

        <div>
          <label htmlFor="max_length_m" className="block text-sm font-semibold text-gray-700 mb-2">
            الطول الأقصى (م) *
          </label>
          <input
            type="number"
            id="max_length_m"
            name="max_length_m"
            value={formData.max_length_m}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="3.5"
          />
        </div>

        {/* Display Order */}
        <div>
          <label htmlFor="display_order" className="block text-sm font-semibold text-gray-700 mb-2">
            ترتيب العرض
          </label>
          <input
            type="number"
            id="display_order"
            name="display_order"
            value={formData.display_order}
            onChange={handleChange}
            min="0"
            step="1"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-600 mt-1">0 = أول ترتيب</p>
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="has_open_bed"
              checked={formData.has_open_bed}
              onChange={handleChange}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-semibold text-gray-700">سرير مفتوح</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-semibold text-gray-700">نشط</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'جاري الإضافة...' : '➕ إضافة المركبة'}
        </button>
      </div>
    </form>
  )
}
