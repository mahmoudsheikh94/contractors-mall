'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface OrderActionsProps {
  orderId: string
  orderNumber: string
}

export function OrderActions({ orderId, orderNumber }: OrderActionsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  // Check email verification status on mount
  useEffect(() => {
    async function checkEmailVerified() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email_verified')
            .eq('id', user.id)
            .single()

          setEmailVerified(profile?.email_verified ?? true)
        }
      } catch (err) {
        console.error('Error checking email verification:', err)
        setEmailVerified(true) // Default to true to not block on error
      } finally {
        setLoading(false)
      }
    }

    checkEmailVerified()
  }, [])

  const handleAccept = async () => {
    if (isSubmitting) return

    // Check email verification
    if (emailVerified === false) {
      setError('يجب تأكيد بريدك الإلكتروني قبل قبول الطلبات')
      return
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من قبول الطلب #${orderNumber}؟\n\nبمجرد القبول، سيتم إشعار العميل ويجب عليك تحضير الطلب للتوصيل.`
    )

    if (!confirmed) return

    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient() as any

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)

      if (updateError) throw updateError

      router.refresh()
      alert('✅ تم قبول الطلب بنجاح!')
    } catch (err) {
      console.error('Error accepting order:', err)
      setError('حدث خطأ أثناء قبول الطلب. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (isSubmitting || !rejectionReason.trim()) {
      setError('يرجى إدخال سبب الرفض')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient() as any

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)

      if (updateError) throw updateError

      router.refresh()
      setShowRejectModal(false)
      alert('تم رفض الطلب وإشعار العميل')
    } catch (err) {
      console.error('Error rejecting order:', err)
      setError('حدث خطأ أثناء رفض الطلب. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking verification
  if (loading) {
    return (
      <div className="flex gap-4">
        <div className="flex-1 bg-gray-200 px-6 py-3 rounded-lg animate-pulse h-12"></div>
        <div className="flex-1 bg-gray-200 px-6 py-3 rounded-lg animate-pulse h-12"></div>
      </div>
    )
  }

  // Show warning if email not verified
  if (emailVerified === false) {
    return (
      <>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🔒</span>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 text-lg mb-2">
                لا يمكن قبول أو رفض الطلبات
              </h4>
              <p className="text-yellow-800 mb-4">
                يجب تأكيد بريدك الإلكتروني أولاً قبل التمكن من إدارة الطلبات. يرجى التحقق من بريدك الإلكتروني والنقر على رابط التأكيد.
              </p>
              <div className="flex gap-4 opacity-50 pointer-events-none">
                <button
                  disabled
                  className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed font-semibold text-lg"
                >
                  ✓ قبول الطلب
                </button>
                <button
                  disabled
                  className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed font-semibold text-lg"
                >
                  ✕ رفض الطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex gap-4">
        <button
          onClick={handleAccept}
          disabled={isSubmitting}
          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
        >
          {isSubmitting ? 'جاري القبول...' : '✓ قبول الطلب'}
        </button>

        <button
          onClick={() => setShowRejectModal(true)}
          disabled={isSubmitting}
          className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
        >
          ✕ رفض الطلب
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              رفض الطلب #{orderNumber}
            </h3>
            <p className="text-gray-600 mb-4">
              يرجى تحديد سبب رفض الطلب. سيتم إرسال السبب إلى العميل.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value)
                setError('')
              }}
              placeholder="مثال: المنتج المطلوب غير متوفر حالياً، أو العنوان خارج منطقة التوصيل..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {isSubmitting ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                  setError('')
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
