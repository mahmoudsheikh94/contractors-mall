'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EmailVerificationWarningProps {
  email?: string | null
}

export default function EmailVerificationWarning({ email }: EmailVerificationWarningProps) {
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')

  const handleResendVerification = async () => {
    if (!email) return

    setIsSending(true)
    setMessage('')

    try {
      const supabase = createClient()

      // Resend verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) throw error

      setMessage('تم إرسال رابط التحقق إلى بريدك الإلكتروني')
    } catch (error) {
      console.error('Resend verification error:', error)
      setMessage('حدث خطأ أثناء إرسال البريد. يرجى المحاولة لاحقاً')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bg-amber-50 border-r-4 border-amber-400 p-4 mb-6" role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="mr-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            تأكيد البريد الإلكتروني مطلوب
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              يرجى تأكيد بريدك الإلكتروني قبل إتمام الطلب. تحقق من صندوق الوارد أو البريد المزعج للحصول على رابط التحقق.
            </p>
            {email && (
              <p className="mt-1 text-xs">
                البريد الإلكتروني: <span className="font-medium">{email}</span>
              </p>
            )}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isSending || !email}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-amber-800 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <svg
                    className="animate-spin -ml-0.5 ml-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-0.5 ml-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  إعادة إرسال رابط التحقق
                </>
              )}
            </button>
          </div>
          {message && (
            <div className={`mt-2 text-sm ${message.includes('خطأ') ? 'text-red-700' : 'text-green-700'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
