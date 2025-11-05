'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function ResendEmailButton() {
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')

  const handleResendEmail = async () => {
    if (isSending) return

    setIsSending(true)
    setMessage('')

    try {
      const supabase = createClient()

      // Get current user email
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        setMessage('لم يتم العثور على البريد الإلكتروني')
        setIsSending(false)
        return
      }

      // Resend confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })

      if (error) {
        console.error('Error resending email:', error)
        setMessage('حدث خطأ أثناء إرسال البريد. يرجى المحاولة لاحقاً.')
      } else {
        setMessage('✅ تم إرسال البريد الإلكتروني بنجاح! يرجى التحقق من صندوق الوارد.')
      }
    } catch (err) {
      console.error('Exception resending email:', err)
      setMessage('حدث خطأ غير متوقع')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleResendEmail}
        disabled={isSending}
        className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium disabled:bg-yellow-400 disabled:cursor-not-allowed"
      >
        {isSending ? 'جاري الإرسال...' : 'إعادة إرسال البريد'}
      </button>
      {message && (
        <p className={`text-xs mt-2 ${message.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
