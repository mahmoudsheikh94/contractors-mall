'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface EscrowActionsProps {
  paymentId: string
  orderId: string
  amount: number
}

export function EscrowActions({ paymentId, orderId, amount }: EscrowActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRelease() {
    const confirmed = confirm(
      `هل أنت متأكد من الإفراج عن ${amount.toFixed(2)} JOD للمورد؟\n\nهذا الإجراء لا يمكن التراجع عنه.`
    )

    if (!confirmed) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      // Update payment status to released
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'released',
          released_at: now,
          updated_at: now,
        })
        .eq('id', paymentId)

      if (paymentError) throw paymentError

      // Update order status to completed
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          updated_at: now,
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      alert('✓ تم الإفراج عن الدفعة بنجاح!')
      router.refresh()
    } catch (err: any) {
      console.error('Error releasing payment:', err)
      setError(err.message || 'فشل الإفراج عن الدفعة')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefund() {
    const reason = prompt(
      `سبب الاسترداد (اختياري):\n\nستتم إعادة ${amount.toFixed(2)} JOD للمقاول`
    )

    if (reason === null) return // User cancelled

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      // Update payment status to refunded
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refunded_at: now,
          updated_at: now,
          metadata: {
            refund_reason: reason || 'No reason provided',
            refunded_by_admin: true,
          },
        })
        .eq('id', paymentId)

      if (paymentError) throw paymentError

      // Update order status to cancelled
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: now,
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      alert('✓ تم استرداد الدفعة بنجاح!')
      router.refresh()
    } catch (err: any) {
      console.error('Error refunding payment:', err)
      setError(err.message || 'فشل استرداد الدفعة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleRelease}
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>جاري المعالجة...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>الإفراج للمورد</span>
            </>
          )}
        </button>

        <button
          onClick={handleRefund}
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>جاري المعالجة...</span>
            </>
          ) : (
            <>
              <span>↩️</span>
              <span>الاسترداد للمقاول</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-3 text-center">
        ⚠️ تأكد من صحة القرار قبل تنفيذه - لا يمكن التراجع عن هذا الإجراء
      </p>
    </div>
  )
}
