'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@contractors-mall/ui'

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (DEV_MODE) {
        // Development mode: Use email magic link
        const { error } = await supabase.auth.signInWithOtp({
          email: contact,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })

        if (error) throw error

        setSuccess(true)
        // For email, we don't redirect to verify - user clicks magic link
      } else {
        // Production mode: Use phone OTP
        let formattedPhone = contact.replace(/\D/g, '')
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '962' + formattedPhone.substring(1)
        } else if (!formattedPhone.startsWith('962')) {
          formattedPhone = '962' + formattedPhone
        }
        formattedPhone = '+' + formattedPhone

        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
          options: {
            channel: 'sms',
          }
        })

        if (error) throw error

        setSuccess(true)
        sessionStorage.setItem('verification_contact', formattedPhone)
        sessionStorage.setItem('verification_type', 'phone')

        setTimeout(() => {
          router.push('/auth/verify')
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إرسال الرمز')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            تسجيل الدخول إلى حسابك
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            أو{' '}
            <Link
              href="/auth/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              إنشاء حساب جديد
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="contact" className="sr-only">
                {DEV_MODE ? 'البريد الإلكتروني' : 'رقم الهاتف'}
              </label>
              <Input
                id="contact"
                name="contact"
                type={DEV_MODE ? 'email' : 'tel'}
                autoComplete={DEV_MODE ? 'email' : 'tel'}
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={
                  DEV_MODE
                    ? 'البريد الإلكتروني (مثال: user@example.com)'
                    : 'رقم الهاتف (مثال: 0791234567)'
                }
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                dir="ltr"
              />
            </div>
          </div>

          {DEV_MODE && (
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>وضع التطوير:</strong> استخدم بريدك الإلكتروني. ستصلك رسالة تحقق على البريد بدلاً من SMS.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {DEV_MODE
                      ? 'تحقق من بريدك الإلكتروني واضغط على الرابط للمتابعة'
                      : 'تم إرسال رمز التحقق إلى هاتفك'}
                  </h3>
                  {DEV_MODE && (
                    <p className="mt-2 text-xs text-green-700">
                      تأكد من التحقق من مجلد البريد غير المرغوب (Spam) إذا لم تجد الرسالة
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading || !contact}
              className="group relative w-full flex justify-center"
              variant="primary"
              size="lg"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>
              {DEV_MODE
                ? 'سيتم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني'
                : 'سيتم إرسال رمز تحقق من 6 أرقام إلى هاتفك'}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}