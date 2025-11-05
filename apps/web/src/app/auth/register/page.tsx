'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@contractors-mall/ui'

type SignupMethod = 'email' | 'phone'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (signupMethod === 'email') {
        // Email + Password signup
        if (formData.password.length < 8) {
          throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone || null,
              role: 'contractor',
              signup_method: 'email',
            }
          }
        })

        if (signupError) throw signupError

        setSuccess(true)
        // For email, user needs to verify via email link
      } else {
        // Phone OTP signup
        if (!formData.phone) {
          throw new Error('رقم الهاتف مطلوب')
        }

        // Format phone number for Jordan
        let formattedPhone = formData.phone.replace(/\D/g, '')
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '962' + formattedPhone.substring(1)
        } else if (!formattedPhone.startsWith('962')) {
          formattedPhone = '962' + formattedPhone
        }
        formattedPhone = '+' + formattedPhone

        // Generate temp email from phone
        const tempEmail = `${formattedPhone.replace(/\D/g, '')}@contractors-mall.local`

        // Create account with temp email
        const { data, error: signupError } = await supabase.auth.signUp({
          email: tempEmail,
          password: formData.password || `temp_${Date.now()}`, // Generate temp password
          options: {
            data: {
              full_name: formData.fullName,
              phone: formattedPhone,
              role: 'contractor',
              signup_method: 'phone',
            }
          }
        })

        if (signupError) throw signupError

        setSuccess(true)
        sessionStorage.setItem('verification_contact', formattedPhone)
        sessionStorage.setItem('verification_type', 'phone')

        // Redirect to phone verification
        setTimeout(() => {
          router.push('/auth/verify')
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في التسجيل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            إنشاء حساب جديد
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            لديك حساب بالفعل؟{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>

        {/* Signup Method Toggle */}
        <div className="flex gap-3 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSignupMethod('email')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
              signupMethod === 'email'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-2xl ml-2">📧</span>
            البريد الإلكتروني
          </button>
          <button
            type="button"
            onClick={() => setSignupMethod('phone')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
              signupMethod === 'phone'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-2xl ml-2">📱</span>
            رقم الهاتف
          </button>
        </div>

        {signupMethod === 'phone' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ✨ <strong>مكافأة:</strong> التسجيل بالهاتف + التحقق = شارتي التحقق (البريد والهاتف) معاً!
            </p>
          </div>
        )}

        {/* Registration Form */}
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل *
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="أحمد محمد"
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            {/* Phone (always shown) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف *
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="07xxxxxxxx"
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                dir="ltr"
              />
            </div>

            {/* Email (only for email signup) */}
            {signupMethod === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  dir="ltr"
                />
              </div>
            )}

            {/* Password (only for email signup) */}
            {signupMethod === 'email' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور *
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="8 أحرف على الأقل"
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
            <p className="font-medium mb-2">عند التسجيل، أنت توافق على:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>شروط الاستخدام</li>
              <li>سياسة الخصوصية</li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="mr-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="mr-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {signupMethod === 'email'
                      ? 'تحقق من بريدك الإلكتروني واضغط على الرابط لإكمال التسجيل'
                      : 'تم إنشاء الحساب! سيتم تحويلك للتحقق من رقم هاتفك...'}
                  </h3>
                  {signupMethod === 'email' && (
                    <p className="mt-2 text-xs text-green-700">
                      تأكد من التحقق من مجلد البريد غير المرغوب (Spam) إذا لم تجد الرسالة
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading}
              className="group relative w-full flex justify-center"
              variant="primary"
              size="lg"
            >
              {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
            </Button>
          </div>

          {/* Info */}
          <div className="text-center text-sm text-gray-600">
            <p>
              {signupMethod === 'email'
                ? 'سيتم إرسال رابط التحقق إلى بريدك الإلكتروني'
                : 'سيتم تحويلك للتحقق من رقم هاتفك'}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
