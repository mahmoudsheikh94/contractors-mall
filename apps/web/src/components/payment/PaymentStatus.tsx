/**
 * Payment Status Component
 * ========================
 * Visual feedback for payment processing states
 */

'use client'

import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react'

type PaymentStatusType = 'processing' | 'success' | 'failed' | 'pending' | 'refunded'

interface PaymentStatusProps {
  status: PaymentStatusType
  amount: number
  currency?: string
  orderNumber?: string
  transactionId?: string
  errorMessage?: string
  refundReason?: string
  showDetails?: boolean
}

export function PaymentStatus({
  status,
  amount,
  currency = 'JOD',
  orderNumber,
  transactionId,
  errorMessage,
  refundReason,
  showDetails = true
}: PaymentStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-primary-600"></div>
            <Clock className="absolute inset-0 m-auto w-10 h-10 text-primary-600" />
          </div>
        )
      case 'success':
        return (
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        )
      case 'failed':
        return (
          <div className="bg-red-100 rounded-full p-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
        )
      case 'pending':
        return (
          <div className="bg-yellow-100 rounded-full p-4">
            <AlertTriangle className="w-12 h-12 text-yellow-600" />
          </div>
        )
      case 'refunded':
        return (
          <div className="bg-gray-100 rounded-full p-4">
            <RefreshCw className="w-12 h-12 text-gray-600" />
          </div>
        )
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'processing':
        return 'جاري معالجة الدفعة...'
      case 'success':
        return 'تمت عملية الدفع بنجاح!'
      case 'failed':
        return 'فشلت عملية الدفع'
      case 'pending':
        return 'في انتظار تأكيد الدفع'
      case 'refunded':
        return 'تم استرجاع المبلغ'
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'يرجى الانتظار بينما نعالج طلبك. قد يستغرق هذا بضع ثوانٍ...'
      case 'success':
        return 'تم استلام دفعتك وحجز المبلغ في حساب الضمان. سيتم الإفراج عنه للمورد بعد تأكيد الاستلام.'
      case 'failed':
        return errorMessage || 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع أخرى.'
      case 'pending':
        return 'تم إرسال طلب الدفع وفي انتظار التأكيد من البنك. سيتم تحديث الحالة قريباً.'
      case 'refunded':
        return refundReason || 'تم استرجاع المبلغ إلى حسابك. قد يستغرق ظهوره في كشف الحساب 3-5 أيام عمل.'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-primary-600'
      case 'success':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'pending':
        return 'text-yellow-600'
      case 'refunded':
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        {getStatusIcon()}
      </div>

      {/* Title */}
      <h2 className={`text-2xl font-bold text-center mb-4 ${getStatusColor()}`}>
        {getStatusTitle()}
      </h2>

      {/* Message */}
      <p className="text-center text-gray-600 mb-6 max-w-md mx-auto">
        {getStatusMessage()}
      </p>

      {/* Transaction Details */}
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
          <div className="space-y-3">
            {/* Amount */}
            <div className="flex justify-between">
              <span className="text-gray-600">المبلغ</span>
              <span className="font-semibold text-gray-900">
                {amount.toFixed(2)} {currency}
              </span>
            </div>

            {/* Order Number */}
            {orderNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">رقم الطلب</span>
                <span className="font-medium text-gray-900">#{orderNumber}</span>
              </div>
            )}

            {/* Transaction ID */}
            {transactionId && status === 'success' && (
              <div className="flex justify-between">
                <span className="text-gray-600">رقم المعاملة</span>
                <span className="font-mono text-sm text-gray-700">{transactionId}</span>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-600">الحالة</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeStyle()}`}>
                {getStatusBadgeText()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {status === 'processing' && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* Success Confetti Effect (CSS only) */}
      {status === 'success' && (
        <div className="mt-6 text-center">
          <div className="inline-block">
            <span className="text-4xl animate-pulse">🎉</span>
            <span className="text-4xl animate-pulse" style={{ animationDelay: '200ms' }}>✨</span>
            <span className="text-4xl animate-pulse" style={{ animationDelay: '400ms' }}>🎊</span>
          </div>
        </div>
      )}

      {/* Error Details */}
      {status === 'failed' && errorMessage && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 mb-1">تفاصيل الخطأ</p>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Refund Details */}
      {status === 'refunded' && refundReason && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 mb-1">سبب الاسترجاع</p>
              <p className="text-sm text-gray-700">{refundReason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function getStatusBadgeStyle(): string {
    switch (status) {
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'success':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'refunded':
        return 'bg-gray-100 text-gray-700'
    }
  }

  function getStatusBadgeText(): string {
    switch (status) {
      case 'processing':
        return 'قيد المعالجة'
      case 'success':
        return 'مكتملة'
      case 'failed':
        return 'فشلت'
      case 'pending':
        return 'معلقة'
      case 'refunded':
        return 'مسترجعة'
    }
  }
}