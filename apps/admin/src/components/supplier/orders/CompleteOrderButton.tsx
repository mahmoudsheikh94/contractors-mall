'use client'

/**
 * Complete Order Button Component
 * ================================
 *
 * Allows suppliers to manually mark an order as completed
 * Only shown for 'delivered' orders with released payment
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface CompleteOrderButtonProps {
  orderId: string
  orderNumber: string
  orderStatus: string
  paymentStatus?: string
}

export function CompleteOrderButton({
  orderId,
  orderNumber,
  orderStatus,
  paymentStatus,
}: CompleteOrderButtonProps) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState('')

  // Only show button for delivered orders with released payment
  if (orderStatus !== 'delivered' || paymentStatus !== 'released') {
    return null
  }

  const handleComplete = async () => {
    // Confirm action
    const confirmed = confirm(
      `هل أنت متأكد من إكمال الطلب ${orderNumber}؟\n\n` +
      'سيتم تحديث حالة الطلب إلى "مكتمل" ويمكن بعدها إصدار فاتورة.'
    )

    if (!confirmed) return

    setIsCompleting(true)
    setError('')

    try {
      const response = await fetch(`/api/supplier/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.error_en || 'Failed to complete order')
      }

      // Success - refresh the page
      alert(data.message || 'تم إكمال الطلب بنجاح!')
      router.refresh()

    } catch (err: any) {
      console.error('Error completing order:', err)
      setError(err.message)
      alert(`خطأ: ${err.message}`)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isCompleting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>جاري الإكمال...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            <span>إكمال الطلب</span>
          </>
        )}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
