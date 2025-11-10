'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface StartDeliveryButtonProps {
  orderId: string
  orderNumber: string
}

export function StartDeliveryButton({ orderId, orderNumber }: StartDeliveryButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleStartDelivery = async () => {
    if (isSubmitting) return

    const confirmed = window.confirm(
      `هل أنت متأكد من بدء توصيل الطلب #${orderNumber}؟\n\n` +
      `بمجرد النقر على "موافق"، سيتم إشعار العميل بأن الطلب في الطريق إليه.`
    )

    if (!confirmed) return

    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      const response = await fetch(`/api/supplier/orders/${orderId}/start-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to start delivery')
      }

      // Refresh the page to show updated status
      router.refresh()

      // Show success message
      alert(`✅ تم بدء التوصيل بنجاح!\n\nالطلب الآن قيد التوصيل وتم إشعار العميل.`)
    } catch (err: any) {
      console.error('Error starting delivery:', err)
      setError(err.message || 'حدث خطأ أثناء بدء التوصيل. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleStartDelivery}
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors flex items-center justify-center gap-3"
      >
        {isSubmitting ? (
          <>
            <span className="inline-block animate-spin">⏳</span>
            <span>جاري بدء التوصيل...</span>
          </>
        ) : (
          <>
            <span>🚚</span>
            <span>بدء التوصيل</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p className="font-semibold mb-1">⚠️ خطأ</p>
          <p>{error}</p>
        </div>
      )}

      <p className="mt-3 text-sm text-gray-600 text-center">
        انقر على الزر عندما تكون جاهزاً لبدء التوصيل للعميل
      </p>
    </div>
  )
}
