'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeliveryConfirmationProps {
  deliveryId: string
  orderTotal: number
  requiresPin: boolean
  pinAttempts: number
}

export function DeliveryConfirmation({
  deliveryId,
  orderTotal,
  requiresPin,
  pinAttempts,
}: DeliveryConfirmationProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // PIN state
  const [pin, setPin] = useState('')

  // Photo state
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const maxPinAttempts = 3
  const remainingAttempts = maxPinAttempts - pinAttempts

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار صورة صحيحة (JPG, PNG, WebP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    setPhoto(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pin.length !== 4) {
      setError('يرجى إدخال رمز PIN مكون من 4 أرقام')
      return
    }

    if (remainingAttempts <= 0) {
      setError('لقد تجاوزت الحد الأقصى لمحاولات إدخال PIN. يرجى الاتصال بالدعم.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/deliveries/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId,
          pin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.remainingAttempts !== undefined) {
          setError(`رمز PIN غير صحيح. المحاولات المتبقية: ${data.remainingAttempts}`)
        } else {
          setError(data.error || 'حدث خطأ أثناء التحقق من PIN')
        }
        setIsSubmitting(false)
        setPin('')
        return
      }

      // Success!
      alert('✅ تم تأكيد التوصيل بنجاح!')
      router.refresh()
    } catch (err) {
      console.error('Error verifying PIN:', err)
      setError('حدث خطأ غير متوقع')
      setIsSubmitting(false)
    }
  }

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!photo) {
      setError('يرجى اختيار صورة')
      return
    }

    setIsSubmitting(true)
    setError('')
    setUploadProgress(0)

    try {
      const supabase = createClient()

      // Upload to Supabase Storage
      const fileName = `${deliveryId}-${Date.now()}.${photo.name.split('.').pop()}`
      const filePath = `deliveries/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deliveries')
        .upload(filePath, photo, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('فشل رفع الصورة. يرجى المحاولة مرة أخرى.')
        setIsSubmitting(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deliveries')
        .getPublicUrl(filePath)

      setUploadProgress(50)

      // Confirm delivery with photo
      const response = await fetch('/api/deliveries/confirm-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId,
          photoUrl: publicUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'حدث خطأ أثناء تأكيد التوصيل')
        setIsSubmitting(false)
        return
      }

      setUploadProgress(100)

      // Success!
      alert('✅ تم تأكيد التوصيل بنجاح!')
      router.refresh()
    } catch (err) {
      console.error('Error confirming delivery:', err)
      setError('حدث خطأ غير متوقع')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {requiresPin ? (
        /* PIN Entry Form */
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-6">
            <span className="text-3xl">🔐</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                تأكيد التوصيل برمز PIN
              </h3>
              <p className="text-blue-800 text-sm">
                يرجى الحصول على رمز PIN المكون من 4 أرقام من العميل لتأكيد التوصيل.
                <br />
                المحاولات المتبقية: <strong>{remainingAttempts}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز PIN (4 أرقام)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                placeholder="••••"
                disabled={isSubmitting || remainingAttempts <= 0}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || pin.length !== 4 || remainingAttempts <= 0}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              {isSubmitting ? 'جاري التحقق...' : 'تأكيد التوصيل'}
            </button>
          </form>
        </div>
      ) : (
        /* Photo Upload Form */
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-6">
            <span className="text-3xl">📸</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-1">
                تأكيد التوصيل بالصورة
              </h3>
              <p className="text-purple-800 text-sm">
                يرجى التقاط صورة للطلب بعد التوصيل كدليل على اكتمال العملية.
              </p>
            </div>
          </div>

          <form onSubmit={handlePhotoSubmit} className="space-y-4">
            {/* Photo Preview */}
            {photoPreview && (
              <div className="mb-4">
                <img
                  src={photoPreview}
                  alt="معاينة الصورة"
                  className="rounded-lg max-h-64 mx-auto"
                />
              </div>
            )}

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                صورة التوصيل
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                الحد الأقصى: 5 ميجابايت • الصيغ المدعومة: JPG, PNG, WebP
              </p>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm text-blue-800 mb-2">
                  <span>جاري الرفع...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !photo}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
            >
              {isSubmitting ? 'جاري الرفع...' : 'تأكيد التوصيل'}
            </button>
          </form>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          📋 معلومات هامة
        </h4>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• تأكد من تسليم الطلب كاملاً قبل التأكيد</li>
          <li>• {requiresPin ? 'رمز PIN سيتم توفيره من قبل العميل' : 'الصورة يجب أن تُظهر الطلب بوضوح'}</li>
          <li>• بعد التأكيد، سيتم تحرير الدفعة من الضمان</li>
          <li>• في حالة وجود مشكلة، يمكن للعميل فتح نزاع خلال 24 ساعة</li>
        </ul>
      </div>
    </div>
  )
}
