/**
 * Delivery Confirmation Component
 * ================================
 * Handles PIN entry for high-value orders and photo upload for low-value orders
 */

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Camera, Key, Upload, CheckCircle } from 'lucide-react'

interface DeliveryConfirmationProps {
  orderId: string
  orderNumber: string
  totalAmount: number
  deliveryId?: string
  onComplete?: () => void
}

export function DeliveryConfirmation({
  orderId,
  orderNumber,
  totalAmount,
  deliveryId,
  onComplete
}: DeliveryConfirmationProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // PIN confirmation states
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [pinError, setPinError] = useState('')

  // Photo confirmation states
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState('')

  // Determine confirmation method based on amount
  const requiresPIN = totalAmount >= 120 // JOD threshold
  const confirmationMethod = requiresPIN ? 'pin' : 'photo'

  // Handle PIN input
  function handlePinChange(index: number, value: string) {
    if (value.length > 1) return

    const newPin = [...pin]
    newPin[index] = value

    setPin(newPin)
    setPinError('')

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`)
      nextInput?.focus()
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Handle photo selection
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('الرجاء اختيار ملف صورة')
      return
    }

    setSelectedPhoto(file)
    setPhotoError('')

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Submit PIN confirmation
  async function handlePINConfirmation() {
    const enteredPin = pin.join('')

    if (enteredPin.length !== 6) {
      setPinError('الرجاء إدخال رمز التأكيد المكون من 6 أرقام')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call API to verify PIN
      const response = await fetch('/api/deliveries/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          pin: enteredPin
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل التحقق من رمز التأكيد')
      }

      setSuccess(true)

      // Update UI after short delay
      setTimeout(() => {
        onComplete?.()
        router.refresh()
      }, 2000)

    } catch (err: any) {
      console.error('PIN verification error:', err)
      setPinError(err.message || 'رمز التأكيد غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  // Submit photo confirmation
  async function handlePhotoConfirmation() {
    if (!selectedPhoto) {
      setPhotoError('الرجاء اختيار صورة التوصيل')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('orderId', orderId)
      formData.append('photo', selectedPhoto)
      if (deliveryId) {
        formData.append('deliveryId', deliveryId)
      }

      // Call API to upload photo
      const response = await fetch('/api/deliveries/confirm-photo', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل رفع صورة التوصيل')
      }

      setSuccess(true)

      // Update UI after short delay
      setTimeout(() => {
        onComplete?.()
        router.refresh()
      }, 2000)

    } catch (err: any) {
      console.error('Photo upload error:', err)
      setPhotoError(err.message || 'فشل رفع الصورة')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-green-500 mb-4">
          <CheckCircle className="w-20 h-20 mx-auto" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          تم تأكيد التوصيل بنجاح!
        </h3>
        <p className="text-gray-600">
          تم تسجيل استلام الطلب #{orderNumber}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        تأكيد استلام الطلب #{orderNumber}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {confirmationMethod === 'pin' ? (
        // PIN Confirmation UI
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-blue-900 font-medium mb-1">
                  أدخل رمز التأكيد المرسل للعميل
                </p>
                <p className="text-blue-700 text-sm">
                  قيمة الطلب: {totalAmount.toFixed(2)} دينار
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              رمز التأكيد (6 أرقام)
            </label>
            <div className="flex gap-2 justify-center" dir="ltr">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    pinError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
              ))}
            </div>
            {pinError && (
              <p className="mt-2 text-sm text-red-600 text-center">{pinError}</p>
            )}
          </div>

          <button
            onClick={handlePINConfirmation}
            disabled={loading || pin.some(d => !d)}
            className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                جاري التحقق...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                تأكيد التوصيل
              </>
            )}
          </button>
        </div>
      ) : (
        // Photo Confirmation UI
        <div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-yellow-900 font-medium mb-1">
                  التقط صورة للطلب عند موقع التوصيل
                </p>
                <p className="text-yellow-700 text-sm">
                  قيمة الطلب: {totalAmount.toFixed(2)} دينار
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            {!photoPreview ? (
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 cursor-pointer transition-colors">
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-700 font-medium mb-1">
                    انقر لاختيار صورة أو التقاط صورة جديدة
                  </p>
                  <p className="text-gray-500 text-sm">
                    JPG, PNG حتى 5 ميجابايت
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="صورة التوصيل"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedPhoto(null)
                    setPhotoPreview(null)
                    setPhotoError('')
                  }}
                  className="absolute top-2 left-2 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
                  disabled={loading}
                >
                  إزالة
                </button>
              </div>
            )}
            {photoError && (
              <p className="mt-2 text-sm text-red-600">{photoError}</p>
            )}
          </div>

          <button
            onClick={handlePhotoConfirmation}
            disabled={loading || !selectedPhoto}
            className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                تأكيد التوصيل بالصورة
              </>
            )}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-4">
        بتأكيد التوصيل، يتم الإفراج عن المبلغ للمورد
      </p>
    </div>
  )
}