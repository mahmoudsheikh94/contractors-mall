'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface EditOrderFormProps {
  order: any
}

export function EditOrderForm({ order }: EditOrderFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    delivery_address: order.delivery_address || '',
    delivery_building: order.delivery_building || '',
    delivery_floor: order.delivery_floor || '',
    delivery_apartment: order.delivery_apartment || '',
    delivery_city: order.delivery_city || '',
    delivery_neighborhood: order.delivery_neighborhood || '',
    delivery_phone: order.delivery_phone || '',
    delivery_instructions: order.delivery_instructions || '',
    scheduled_delivery_date: order.scheduled_delivery_date || '',
    delivery_time_slot: order.delivery_time_slot || '',
    special_requests: order.special_requests || '',
    internal_reference: order.internal_reference || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update(formData)
        .eq('id', order.id)

      if (orderError) throw orderError

      // Log the admin action as an internal note
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('order_notes').insert({
          order_id: order.id,
          note: `تم تعديل تفاصيل الطلب من قبل المسؤول`,
          created_by: user.id,
          is_internal: true,
        })
      }

      alert('تم حفظ التعديلات بنجاح')
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving order:', error)
      alert('حدث خطأ أثناء حفظ التعديلات')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
      >
        تعديل الطلب
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-900 mb-4">تعديل معلومات التوصيل</div>

      {/* Delivery Address */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">العنوان</label>
        <input
          type="text"
          name="delivery_address"
          value={formData.delivery_address}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Building, Floor, Apartment */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">بناية</label>
          <input
            type="text"
            name="delivery_building"
            value={formData.delivery_building}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">طابق</label>
          <input
            type="text"
            name="delivery_floor"
            value={formData.delivery_floor}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">شقة</label>
          <input
            type="text"
            name="delivery_apartment"
            value={formData.delivery_apartment}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* City, Neighborhood */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">المدينة</label>
          <input
            type="text"
            name="delivery_city"
            value={formData.delivery_city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">الحي</label>
          <input
            type="text"
            name="delivery_neighborhood"
            value={formData.delivery_neighborhood}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">رقم الهاتف</label>
        <input
          type="tel"
          name="delivery_phone"
          value={formData.delivery_phone}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Scheduled Date */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">تاريخ التوصيل المقرر</label>
        <input
          type="date"
          name="scheduled_delivery_date"
          value={formData.scheduled_delivery_date}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Time Slot */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">الفترة الزمنية</label>
        <input
          type="text"
          name="delivery_time_slot"
          value={formData.delivery_time_slot}
          onChange={handleChange}
          placeholder="مثال: 9:00 صباحاً - 12:00 ظهراً"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Delivery Instructions */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">ملاحظات التوصيل</label>
        <textarea
          name="delivery_instructions"
          value={formData.delivery_instructions}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Special Requests */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">طلبات خاصة</label>
        <textarea
          name="special_requests"
          value={formData.special_requests}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Internal Reference */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">المرجع الداخلي</label>
        <input
          type="text"
          name="internal_reference"
          value={formData.internal_reference}
          onChange={handleChange}
          placeholder="اختياري"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          إلغاء
        </button>
      </div>
    </div>
  )
}
