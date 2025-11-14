/**
 * Checkout Flow Component
 * =======================
 * Complete checkout process with escrow explanation
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CardInput, type CardData } from './CardInput'
import { SavedPaymentMethods } from './SavedPaymentMethods'
import { PaymentStatus } from './PaymentStatus'
import { Shield, Info, Lock, CheckCircle } from 'lucide-react'

interface CheckoutFlowProps {
  orderId: string
  orderNumber: string
  amount: number
  currency?: string
  supplierId: string
  supplierName: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryAddress: string
  onSuccess?: (transactionId: string) => void
  onError?: (error: string) => void
}

type PaymentStep = 'method' | 'processing' | 'success' | 'error'
type PaymentMethod = 'saved' | 'new'

export function CheckoutFlow({
  orderId,
  orderNumber,
  amount,
  currency = 'JOD',
  supplierId: _supplierId,
  supplierName,
  customerId,
  customerName: _customerName,
  customerEmail,
  customerPhone,
  deliveryAddress,
  onSuccess,
  onError
}: CheckoutFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<PaymentStep>('method')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('saved')
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [saveCard, setSaveCard] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>('')
  const [transactionId, setTransactionId] = useState<string>('')
  const [agreedToEscrow, setAgreedToEscrow] = useState(false)

  // Process payment
  async function processPayment() {
    if (!agreedToEscrow) {
      setError('يجب الموافقة على شروط الضمان')
      return
    }

    setProcessing(true)
    setError('')
    setStep('processing')

    try {
      // Prepare payment data
      const paymentData = {
        orderId,
        amount,
        currency,
        customerId,
        customerEmail,
        customerPhone,
        paymentMethod: paymentMethod === 'saved' ? selectedMethodId : 'new',
        cardData: paymentMethod === 'new' ? cardData : undefined,
        saveCard: paymentMethod === 'new' && saveCard
      }

      // Call payment API
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'فشلت عملية الدفع')
      }

      // Payment successful
      setTransactionId(result.transactionId)
      setStep('success')

      // Update order status locally
      const supabase = createClient()
      await supabase
        .from('orders')
        .update({
          status: 'pending',
          payment_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      // Call success callback
      if (onSuccess) {
        onSuccess(result.transactionId)
      }

      // Redirect after delay
      setTimeout(() => {
        router.push(`/orders/${orderId}/tracking`)
      }, 3000)

    } catch (err: any) {
      console.error('Payment error:', err)
      setError(err.message || 'حدث خطأ أثناء معالجة الدفع')
      setStep('error')

      if (onError) {
        onError(err.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  // Retry payment
  function retryPayment() {
    setStep('method')
    setError('')
    setTransactionId('')
  }

  // Render based on step
  if (step === 'processing') {
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentStatus
          status="processing"
          amount={amount}
          currency={currency}
          orderNumber={orderNumber}
        />
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentStatus
          status="success"
          amount={amount}
          currency={currency}
          orderNumber={orderNumber}
          transactionId={transactionId}
        />
        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">
            سيتم تحويلك إلى صفحة تتبع الطلب...
          </p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentStatus
          status="failed"
          amount={amount}
          currency={currency}
          orderNumber={orderNumber}
          errorMessage={error}
        />
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={retryPayment}
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
          >
            إعادة المحاولة
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            العودة للطلبات
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">ملخص الطلب</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">رقم الطلب</span>
                <span className="font-medium">#{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">المورد</span>
                <span className="font-medium">{supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عنوان التوصيل</span>
                <span className="font-medium text-right max-w-xs">{deliveryAddress}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>المبلغ الإجمالي</span>
                <span className="text-primary-600">
                  {amount.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Escrow Explanation */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  نظام الضمان المالي
                </h3>
                <p className="text-blue-800 text-sm mb-3">
                  لحماية حقوق جميع الأطراف، يتم حجز المبلغ في حساب ضمان آمن حتى تأكيد استلام الطلب.
                </p>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>يتم حجز المبلغ فور تأكيد الدفع</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      يتم الإفراج عن المبلغ للمورد بعد تأكيد الاستلام
                      {amount >= 120 ? ' برمز التأكيد' : ' بالصورة'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>في حالة وجود نزاع، يبقى المبلغ محجوزاً حتى حل النزاع</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">طريقة الدفع</h3>

            {/* Method Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPaymentMethod('saved')}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                  paymentMethod === 'saved'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                البطاقات المحفوظة
              </button>
              <button
                onClick={() => setPaymentMethod('new')}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                  paymentMethod === 'new'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                بطاقة جديدة
              </button>
            </div>

            {/* Payment Method Content */}
            {paymentMethod === 'saved' ? (
              <SavedPaymentMethods
                customerId={customerId}
                onMethodSelected={setSelectedMethodId}
                selectedMethodId={selectedMethodId}
                showAddNew={true}
                onAddNew={() => setPaymentMethod('new')}
              />
            ) : (
              <CardInput
                onCardValid={(data) => {
                  setCardData(data)
                  setSaveCard(data.saveCard || false)
                }}
                onCardInvalid={() => setCardData(null)}
                saveCard={saveCard}
                onSaveCardChange={setSaveCard}
                disabled={processing}
              />
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}
          </div>

          {/* Agreement Checkbox */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToEscrow}
                onChange={(e) => setAgreedToEscrow(e.target.checked)}
                className="w-5 h-5 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                أوافق على <a href="/terms" className="text-primary-600 hover:underline">شروط الخدمة</a> و
                <a href="/escrow-terms" className="text-primary-600 hover:underline"> شروط نظام الضمان</a>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            onClick={processPayment}
            disabled={
              processing ||
              !agreedToEscrow ||
              (paymentMethod === 'saved' && !selectedMethodId) ||
              (paymentMethod === 'new' && !cardData)
            }
            className="w-full px-6 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <span className="animate-spin">⏳</span>
                جاري المعالجة...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                دفع {amount.toFixed(2)} {currency}
              </>
            )}
          </button>
        </div>

        {/* Security Badges */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">معلومات الأمان</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">تشفير SSL</p>
                  <p className="text-sm text-gray-600">جميع المعاملات محمية بتشفير 256-bit</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">حماية المشتري</p>
                  <p className="text-sm text-gray-600">ضمان استرجاع المبلغ في حالة عدم الاستلام</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">معتمد من</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-blue-600 font-bold">VISA</span>
                    <span className="text-red-500 font-bold">MC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-2">تحتاج مساعدة؟</h4>
            <p className="text-sm text-gray-600 mb-3">
              فريق الدعم متاح على مدار الساعة
            </p>
            <div className="space-y-2 text-sm">
              <a href="tel:+962791234567" className="flex items-center gap-2 text-primary-600 hover:underline">
                📞 +962 79 123 4567
              </a>
              <a href="mailto:support@contractorsmall.jo" className="flex items-center gap-2 text-primary-600 hover:underline">
                ✉️ support@contractorsmall.jo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}