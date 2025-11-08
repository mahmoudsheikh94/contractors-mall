'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ChangeOrderStatusFormProps {
  orderId: string
  currentStatus: string
}

type OrderStatus = 'pending' | 'confirmed' | 'in_delivery' | 'delivered' | 'completed' | 'cancelled'

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'معلق', color: 'yellow' },
  { value: 'confirmed', label: 'مؤكد', color: 'blue' },
  { value: 'in_delivery', label: 'قيد التوصيل', color: 'purple' },
  { value: 'delivered', label: 'تم التوصيل', color: 'green' },
  { value: 'completed', label: 'مكتمل', color: 'green' },
]

export function ChangeOrderStatusForm({ orderId, currentStatus }: ChangeOrderStatusFormProps) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus as OrderStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async () => {
    if (selectedStatus === currentStatus) {
      alert('الرجاء اختيار حالة مختلفة')
      return
    }

    const confirmed = confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}"?`)
    if (!confirmed) return

    setIsUpdating(true)

    try {
      const supabase = createClient()

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: selectedStatus,
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Log the admin action as an internal note
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const oldStatusLabel = STATUS_OPTIONS.find(s => s.value === currentStatus)?.label || currentStatus
        const newStatusLabel = STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label || selectedStatus

        await supabase.from('order_notes').insert({
          order_id: orderId,
          note: `تم تغيير حالة الطلب من "${oldStatusLabel}" إلى "${newStatusLabel}" من قبل المسؤول`,
          created_by: user.id,
          is_internal: true,
        })
      }

      alert('تم تحديث حالة الطلب بنجاح')
      router.refresh()
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('حدث خطأ أثناء تحديث حالة الطلب')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-semibold text-gray-900">تغيير الحالة:</label>

      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary-600 focus:border-transparent"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleStatusChange}
        disabled={isUpdating || selectedStatus === currentStatus}
        className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? 'جاري التحديث...' : 'تحديث'}
      </button>
    </div>
  )
}
