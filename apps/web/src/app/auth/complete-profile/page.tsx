'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select } from '@contractors-mall/ui'

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'contractor' as 'contractor' | 'supplier_admin',
    preferred_language: 'ar'  // Now a string, not enum
  })

  useEffect(() => {
    checkAuthAndProfile()
  }, [])

  const checkAuthAndProfile = async () => {
    try {
      setChecking(true)

      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('No authenticated user, redirecting to login')
        router.push('/auth/login')
        return
      }

      // Check if profile already exists using the API
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()

        if (data.exists && data.profile) {
          console.log('Profile already exists, redirecting to dashboard')
          // Profile exists, redirect based on role
          redirectBasedOnRole(data.profile.role)
        } else {
          console.log('No profile found, user needs to complete profile')
          // Pre-fill form if we have user metadata
          if (user.user_metadata?.full_name) {
            setFormData(prev => ({
              ...prev,
              full_name: user.user_metadata.full_name
            }))
          }
        }
      } else if (response.status === 401) {
        // Not authenticated
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setError('حدث خطأ في التحقق من البيانات')
    } finally {
      setChecking(false)
    }
  }

  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case 'supplier_admin':
        router.push('/supplier/dashboard')
        break
      case 'admin':
        router.push('/admin/dashboard')
        break
      case 'contractor':
      default:
        router.push('/dashboard')
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use the server API to create/update profile
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          role: formData.role,
          preferred_language: formData.preferred_language
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'حدث خطأ في حفظ البيانات')
      }

      if (data.success) {
        // Success! Redirect to appropriate dashboard
        router.push(data.redirectUrl || '/dashboard')
      }

    } catch (err: any) {
      console.error('Profile submission error:', err)
      setError(err.message || 'حدث خطأ في حفظ البيانات')

      // Retry logic for transient failures
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          setError('')
          setLoading(false)
        }, 1000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError('')
    setRetryCount(0)
    checkAuthAndProfile()
  }

  // Show loading state while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحقق من البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            أكمل بياناتك
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            نحتاج بعض المعلومات لإكمال حسابك
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل *
              </label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="أدخل اسمك الكامل"
                className="w-full"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                نوع الحساب *
              </label>
              <Select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'contractor' | 'supplier_admin' })}
                className="w-full"
                disabled={loading}
              >
                <option value="contractor">مقاول / صاحب مشروع</option>
                <option value="supplier_admin">مورّد مواد بناء</option>
              </Select>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                اللغة المفضلة
              </label>
              <Select
                id="language"
                name="language"
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                className="w-full"
                disabled={loading}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </Select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  {error.includes('row-level security') && (
                    <p className="text-xs text-red-600 mt-2">
                      تأكد من تشغيل آخر تحديث لقاعدة البيانات (migration)
                    </p>
                  )}
                </div>
                {retryCount < 2 && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-sm text-red-600 hover:text-red-500 underline"
                  >
                    إعادة المحاولة
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading || !formData.full_name.trim()}
              className="group relative w-full flex justify-center"
              variant="primary"
              size="lg"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </Button>

            {retryCount > 0 && (
              <p className="text-center text-sm text-gray-500">
                محاولة {retryCount} من 2
              </p>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            مشاكل في التسجيل؟{' '}
            <button
              onClick={() => {
                supabase.auth.signOut()
                router.push('/auth/login')
              }}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              حاول تسجيل الدخول مرة أخرى
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}