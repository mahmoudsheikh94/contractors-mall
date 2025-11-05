'use client'

/**
 * Supplier/Admin Login Page
 *
 * Handles authentication for suppliers and admins.
 * Uses email/phone + password authentication.
 * Redirects based on user role after successful login.
 */

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('تم التسجيل بنجاح! سيتم مراجعة حسابك وتفعيله قريباً.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .single()

      if (profileError) throw profileError

      // Check if user is supplier_admin or admin
      if (profile.role === 'supplier_admin') {
        // Check if supplier is verified
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('is_verified')
          .eq('owner_id', authData.user.id)
          .single()

        if (!supplier?.is_verified) {
          setError('حسابك قيد المراجعة. سيتم إشعارك عند التفعيل')
          await supabase.auth.signOut()
          return
        }

        router.push('/supplier/dashboard')
      } else if (profile.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        setError('غير مصرح لك بالدخول. هذه البوابة للموردين والمشرفين فقط')
        await supabase.auth.signOut()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'فشل تسجيل الدخول. تحقق من البيانات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center py-12 px-4" dir="rtl">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-4">🏗️</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            بوابة الموردين
          </h1>
          <p className="text-gray-600">
            تسجيل الدخول لإدارة منتجاتك وطلباتك
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-center">{successMessage}</p>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="example@company.com"
                required
                disabled={loading}
                dir="ltr"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                disabled={loading}
                dir="ltr"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></span>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
          </form>

          {/* Register Link */}
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-gray-600">
              لا تملك حساب؟{' '}
              <Link
                href="/auth/register"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                سجل كمورد جديد
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-gray-500">
          <p>المقاول مول © 2025 - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
      <LoginForm />
    </Suspense>
  )
}