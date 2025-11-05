'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ThresholdsFormProps {
  initialValues: {
    pin_threshold_jod: number
    site_visit_threshold_jod: number
    safety_margin_percentage: number
  }
}

export function ThresholdsForm({ initialValues }: ThresholdsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    pin_threshold_jod: initialValues.pin_threshold_jod,
    site_visit_threshold_jod: initialValues.site_visit_threshold_jod,
    safety_margin_percentage: initialValues.safety_margin_percentage,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: parseFloat(e.target.value) || 0,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const supabase = createClient()

      // Validate values
      if (formData.pin_threshold_jod <= 0) {
        throw new Error('عتبة PIN يجب أن تكون أكبر من صفر')
      }
      if (formData.site_visit_threshold_jod <= 0) {
        throw new Error('عتبة الزيارة الميدانية يجب أن تكون أكبر من صفر')
      }
      if (formData.safety_margin_percentage < 0 || formData.safety_margin_percentage > 50) {
        throw new Error('هامش الأمان يجب أن يكون بين 0 و 50%')
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Update each setting
      const updates = [
        {
          key: 'pin_threshold_jod',
          value: formData.pin_threshold_jod,
          description: 'Minimum order amount requiring PIN verification for delivery',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        {
          key: 'site_visit_threshold_jod',
          value: formData.site_visit_threshold_jod,
          description: 'Minimum dispute amount requiring QC site visit',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        {
          key: 'safety_margin_percentage',
          value: formData.safety_margin_percentage,
          description: 'Safety margin percentage for vehicle selection',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
      ]

      for (const setting of updates) {
        const { error: upsertError } = await supabase
          .from('settings')
          .upsert(setting, {
            onConflict: 'key',
          })

        if (upsertError) {
          throw upsertError
        }
      }

      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      console.error('Error updating thresholds:', err)
      setError(err.message || 'فشل تحديث الإعدادات')
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
          ✓ تم تحديث الإعدادات بنجاح!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* PIN Threshold */}
        <div>
          <label htmlFor="pin_threshold_jod" className="block text-sm font-semibold text-gray-700 mb-2">
            عتبة PIN (JOD)
          </label>
          <input
            type="number"
            id="pin_threshold_jod"
            name="pin_threshold_jod"
            value={formData.pin_threshold_jod}
            onChange={handleChange}
            min="0"
            step="1"
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-600 mt-1">
            الطلبات ≥ هذا المبلغ تتطلب PIN
          </p>
        </div>

        {/* Site Visit Threshold */}
        <div>
          <label htmlFor="site_visit_threshold_jod" className="block text-sm font-semibold text-gray-700 mb-2">
            عتبة زيارة الموقع (JOD)
          </label>
          <input
            type="number"
            id="site_visit_threshold_jod"
            name="site_visit_threshold_jod"
            value={formData.site_visit_threshold_jod}
            onChange={handleChange}
            min="0"
            step="1"
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-600 mt-1">
            النزاعات ≥ هذا المبلغ تتطلب زيارة
          </p>
        </div>

        {/* Safety Margin */}
        <div>
          <label htmlFor="safety_margin_percentage" className="block text-sm font-semibold text-gray-700 mb-2">
            هامش الأمان (%)
          </label>
          <input
            type="number"
            id="safety_margin_percentage"
            name="safety_margin_percentage"
            value={formData.safety_margin_percentage}
            onChange={handleChange}
            min="0"
            max="50"
            step="1"
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-600 mt-1">
            إضافة على سعة المركبة (0-50%)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </form>
  )
}
