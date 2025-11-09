'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@contractors-mall/ui'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !email.includes('@')) {
        throw new Error('يرجى إدخال بريد إلكتروني صحيح')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إرسال رابط إعادة التعيين')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            نسيت كلمة المرور؟
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
          </p>
        </div>

        {!success ? (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="email" className="sr-only">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10"
                disabled={loading}
                dir="ltr"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
                className="group relative w-full flex justify-center"
                variant="primary"
                size="lg"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </Button>

              <Link
                href="/auth/login"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-8">
            <div className="rounded-md bg-green-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="mr-3">
                  <h3 className="text-sm font-medium text-green-800">
                    تم إرسال رابط إعادة التعيين!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>تحقق من بريدك الإلكتروني واضغط على الرابط لإعادة تعيين كلمة المرور.</p>
                    <p className="mt-2">إذا لم تجد الرسالة، تحقق من مجلد البريد غير المرغوب (Spam).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                }}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                إرسال لبريد إلكتروني آخر
              </button>

              <Link
                href="/auth/login"
                className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
