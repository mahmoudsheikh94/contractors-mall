'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CancelOrderButtonProps {
  orderId: string
  orderNumber: string
}

export function CancelOrderButton({ orderId, orderNumber }: CancelOrderButtonProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const handleCancel = async () => {
    if (!reason.trim()) {
      alert('يرجى إدخال سبب الإلغاء')
      return
    }

    setIsCancelling(true)

    try {
      const supabase = createClient()

      // Update order status to cancelled
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          rejection_reason: reason,
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Log the admin action as an internal note
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('order_notes').insert({
          order_id: orderId,
          note: `تم إلغاء الطلب من قبل المسؤول. السبب: ${reason}`,
          created_by: user.id,
          is_internal: true,
        })
      }

      alert('تم إلغاء الطلب بنجاح')
      setIsConfirming(false)
      router.refresh()
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('حدث خطأ أثناء إلغاء الطلب')
    } finally {
      setIsCancelling(false)
    }
  }

  if (!isConfirming) {
    return (
      <button
        onClick={() => setIsConfirming(true)}
        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
      >
        إلغاء الطلب
      </button>
    )
  }

  return (
    <div className="flex-1 bg-white border-2 border-red-200 rounded-lg p-4">
      <h4 className="font-semibold text-red-900 mb-3">تأكيد إلغاء الطلب #{orderNumber}</h4>

      <div className="mb-4">
        <label className="block text-sm text-gray-700 mb-2">سبب الإلغاء *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="يرجى توضيح سبب إلغاء هذا الطلب..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isCancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          disabled={isCancelling}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          رجوع
        </button>
      </div>
    </div>
  )
}
