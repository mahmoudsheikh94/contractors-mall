'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PhoneVerification() {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const sendVerificationCode = async () => {
    setSending(true)
    setError('')
    setSuccess('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً')
      }

      const response = await fetch('/api/auth/send-phone-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل إرسال رمز التحقق')
      }

      setCodeSent(true)
      setSuccess(`تم إرسال رمز التحقق إلى هاتفك. (للاختبار: ${data.code})`)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال رمز التحقق')
    } finally {
      setSending(false)
    }
  }

  const verifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً')
      }

      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          code: verificationCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'رمز التحقق غير صحيح')
      }

      setSuccess('🎉 تم التحقق من رقم هاتفك بنجاح! حصلت على شارتي التحقق (البريد والهاتف)')
      setVerificationCode('')
      setCodeSent(false)

      // Reload page after 2 seconds to show badges
      setTimeout(() => window.location.reload(), 2000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحقق')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900">تحقق من رقم هاتفك</h3>
        <p className="text-sm text-gray-600 mt-2">
          احصل على شارتي التحقق (البريد والهاتف) معاً
        </p>
      </div>

      {!codeSent ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">✨ المزايا</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ شارة البريد الإلكتروني المُحقق</li>
              <li>✅ شارة رقم الهاتف المُحقق</li>
              <li>✅ ثقة أكبر من العملاء</li>
              <li>✅ أولوية في البحث</li>
            </ul>
          </div>

          <button
            onClick={sendVerificationCode}
            disabled={sending}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
          </button>
        </div>
      ) : (
        <form onSubmit={verifyPhone} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              أدخل رمز التحقق
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="XXXX"
              maxLength={4}
              required
              className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              أدخل الرمز المكون من 4 أرقام المرسل إلى هاتفك
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || verificationCode.length !== 4}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'جاري التحقق...' : 'تحقق الآن'}
          </button>

          <button
            type="button"
            onClick={sendVerificationCode}
            disabled={sending}
            className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
          >
            {sending ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          🔒 نحن نحترم خصوصيتك. لن نشارك رقم هاتفك مع أي طرف ثالث.
        </p>
      </div>
    </div>
  )
}
