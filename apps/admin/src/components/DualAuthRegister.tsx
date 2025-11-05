'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AuthMethod = 'email' | 'phone'

interface DualAuthRegisterProps {
  onSuccess?: () => void
  role?: 'supplier_admin' | 'contractor'
}

export default function DualAuthRegister({ onSuccess, role = 'supplier_admin' }: DualAuthRegisterProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validate passwords
      if (formData.password !== formData.confirmPassword) {
        throw new Error('كلمات المرور غير متطابقة')
      }

      if (formData.password.length < 8) {
        throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      }

      const supabase = createClient()

      if (authMethod === 'email') {
        // Email signup
        if (!formData.email) {
          throw new Error('البريد الإلكتروني مطلوب')
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone || null,
              role: role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })

        if (signUpError) throw signUpError

        setSuccess('تم إرسال رابط التحقق إلى بريدك الإلكتروني. يرجى التحقق من البريد الوارد.')
      } else {
        // Phone signup
        if (!formData.phone) {
          throw new Error('رقم الهاتف مطلوب')
        }

        // For phone signup, we'll create the account with email as phone@contractors-mall.local
        // Then require phone verification
        const tempEmail = `${formData.phone.replace(/\D/g, '')}@contractors-mall.local`

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              role: role,
              signup_method: 'phone',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })

        if (signUpError) throw signUpError

        setSuccess('تم إنشاء الحساب. يرجى التحقق من رقم هاتفك للحصول على كامل الامتيازات.')

        // Auto-send verification code
        if (data.user) {
          await fetch('/api/auth/send-phone-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id })
          })
        }
      }

      if (onSuccess) {
        setTimeout(onSuccess, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التسجيل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">إنشاء حساب جديد</h2>

      {/* Auth Method Selector */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setAuthMethod('email')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            authMethod === 'email'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📧 البريد الإلكتروني
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('phone')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            authMethod === 'phone'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📱 رقم الهاتف
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الاسم الكامل *
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        {/* Email (required for email auth, optional for phone auth) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            البريد الإلكتروني {authMethod === 'email' ? '*' : '(اختياري)'}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required={authMethod === 'email'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>

        {/* Phone (optional for email auth, required for phone auth) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رقم الهاتف {authMethod === 'phone' ? '*' : '(اختياري)'}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required={authMethod === 'phone'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+962 7X XXX XXXX"
          />
          {authMethod === 'phone' && (
            <p className="text-xs text-gray-500 mt-1">
              ✅ التحقق من رقم الهاتف يمنحك شارة التحقق المزدوجة
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            كلمة المرور *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="8 أحرف على الأقل"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تأكيد كلمة المرور *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="أعد إدخال كلمة المرور"
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">ℹ️ ملاحظة</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• التسجيل بالبريد: تحصل على شارة تحقق البريد</li>
          <li>• التسجيل بالهاتف + التحقق: تحصل على شارتي التحقق معاً</li>
          <li>• يمكنك إضافة وسيلة التحقق الأخرى لاحقاً</li>
        </ul>
      </div>
    </div>
  )
}
