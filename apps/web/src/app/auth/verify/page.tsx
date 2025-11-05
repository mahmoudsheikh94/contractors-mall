'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@contractors-mall/ui'

export default function VerifyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [otp, setOtp] = useState('')
  const [contact, setContact] = useState('')
  const [verificationType, setVerificationType] = useState<'email' | 'phone'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    // Get contact and type from session storage
    const storedContact = sessionStorage.getItem('verification_contact')
    const storedType = sessionStorage.getItem('verification_type') as 'email' | 'phone'

    if (!storedContact) {
      router.push('/auth/login')
    } else {
      setContact(storedContact)
      setVerificationType(storedType || 'email')
    }
  }, [router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error, data } = await supabase.auth.verifyOtp(
        verificationType === 'email'
          ? { email: contact, token: otp, type: 'email' as const }
          : { phone: contact, token: otp, type: 'sms' as const }
      )

      if (error) throw error

      if (data.user) {
        // Check if user has a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single() as { data: any | null }

        if (profile) {
          // User has profile, redirect based on role
          if (profile.role === 'supplier_admin') {
            router.push('/supplier/dashboard')
          } else if (profile.role === 'admin') {
            router.push('/admin/dashboard')
          } else {
            router.push('/dashboard')
          }
        } else {
          // New user, redirect to profile setup
          router.push('/auth/complete-profile')
        }
      }
    } catch (err: any) {
      setError(err.message || 'رمز التحقق غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setResending(true)

    try {
      if (verificationType === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: contact,
          options: {
            shouldCreateUser: true,
          }
        })
        if (error) throw error
        alert('تم إرسال رمز جديد إلى بريدك الإلكتروني')
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: contact,
          options: {
            channel: 'sms',
          }
        })
        if (error) throw error
        alert('تم إرسال رمز جديد إلى هاتفك')
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إعادة الإرسال')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            تحقق من رقم هاتفك
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            أدخل رمز التحقق المكون من 6 أرقام المرسل إلى
          </p>
          <p className="mt-1 text-center text-lg font-medium text-gray-900" dir="ltr">
            {contact}
          </p>
          {verificationType === 'email' && (
            <p className="mt-2 text-center text-xs text-blue-600">
              تحقق من بريدك الإلكتروني (بما في ذلك مجلد البريد غير المرغوب)
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          <div>
            <label htmlFor="otp" className="sr-only">
              رمز التحقق
            </label>
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="أدخل رمز التحقق"
              className="appearance-none rounded-md relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl tracking-widest focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading || otp.length !== 6}
              className="group relative w-full flex justify-center"
              variant="primary"
              size="lg"
            >
              {loading ? 'جاري التحقق...' : 'تحقق'}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              className="text-sm text-primary-600 hover:text-primary-500 disabled:text-gray-400"
            >
              {resending ? 'جاري الإرسال...' : 'لم تستلم الرمز؟ أعد الإرسال'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}