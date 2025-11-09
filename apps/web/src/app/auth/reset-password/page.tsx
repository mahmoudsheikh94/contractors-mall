'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@contractors-mall/ui'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (password.length < 8) {
        throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      }

      if (password !== confirmPassword) {
        throw new Error('كلمتا المرور غير متطابقتين')
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إعادة تعيين كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            إعادة تعيين كلمة المرور
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            أدخل كلمة المرور الجديدة لحسابك
          </p>
        </div>

        {!success ? (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الجديدة *
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور *
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={loading}
                />
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600">كلمتا المرور غير متطابقتين</p>
              )}
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
                disabled={loading || password !== confirmPassword}
                className="group relative w-full flex justify-center"
                variant="primary"
                size="lg"
              >
                {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </Button>

              <Link
                href="/auth/login"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                إلغاء
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
                    تم تحديث كلمة المرور بنجاح!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>سيتم تحويلك لصفحة تسجيل الدخول خلال ثوانٍ...</p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              الانتقال لتسجيل الدخول الآن
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
