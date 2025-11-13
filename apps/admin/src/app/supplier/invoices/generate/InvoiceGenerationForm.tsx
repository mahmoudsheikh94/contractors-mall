'use client'

/**
 * Invoice Generation Form Component
 * =================================
 *
 * Client-side form for generating Jordan-compliant invoices
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  total_jod: number
  delivery_fee_jod: number
  delivery_address: string
  contractor: {
    id: string
    full_name: string
    phone: string
    email: string
    city: string
  }
  order_items: Array<{
    id: string
    quantity: number
    unit_price_jod: number
    total_jod: number
    product: {
      name_ar: string
      name_en: string
      sku: string
    }
  }>
}

interface Supplier {
  id: string
  business_name: string
  tax_number: string
  tax_registration_name?: string
  tax_registration_name_en?: string
  phone?: string
  address?: string
  city?: string
}

interface InvoiceGenerationFormProps {
  orders: Order[]
  supplier: Supplier
  initialOrderId?: string
}

type InvoiceType = 'income' | 'sales_tax' | 'special_tax'
type InvoiceCategory = 'local' | 'export' | 'development_zone'
type BuyerIdType = 'national_id' | 'tax_number' | 'personal_number'

export function InvoiceGenerationForm({ orders, supplier, initialOrderId }: InvoiceGenerationFormProps) {
  const router = useRouter()

  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || '')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sales_tax')
  const [invoiceCategory, setInvoiceCategory] = useState<InvoiceCategory>('local')
  const [buyerName, setBuyerName] = useState('')
  const [buyerIdType, setBuyerIdType] = useState<BuyerIdType>('national_id')
  const [buyerIdNumber, setBuyerIdNumber] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerCity, setBuyerCity] = useState('')
  const [buyerPostalCode, setBuyerPostalCode] = useState('')
  const [notes, setNotes] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Get selected order
  const selectedOrder = orders.find(o => o.id === selectedOrderId)

  // Pre-fill buyer details if initial order is provided
  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === initialOrderId)
      if (order) {
        const contractor = Array.isArray(order.contractor) ? order.contractor[0] : order.contractor
        setBuyerName(contractor?.full_name || '')
        setBuyerPhone(contractor?.phone || '')
        setBuyerCity(contractor?.city || '')
      }
    }
  }, [initialOrderId, orders])

  // Auto-fill buyer details when order is selected
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId)
    const order = orders.find(o => o.id === orderId)
    if (order) {
      const contractor = Array.isArray(order.contractor) ? order.contractor[0] : order.contractor
      setBuyerName(contractor?.full_name || '')
      setBuyerPhone(contractor?.phone || '')
      setBuyerCity(contractor?.city || '')
    }
  }

  // Calculate totals with tax
  const calculateTotals = () => {
    if (!selectedOrder) {
      return { subtotal: 0, tax: 0, total: 0 }
    }

    const subtotal = parseFloat(selectedOrder.total_jod.toString())
    let taxRate = 0

    if (invoiceType !== 'income') {
      if (invoiceCategory === 'local') {
        taxRate = 0.16 // 16% sales tax
      } else {
        taxRate = 0 // 0% for export and development zones
      }
    }

    const tax = subtotal * taxRate
    const total = subtotal + tax

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Validate
      if (!selectedOrderId) {
        throw new Error('يرجى اختيار طلب')
      }

      // Validate buyer name for large orders
      if (selectedOrder && parseFloat(selectedOrder.total_jod.toString()) >= 10000 && !buyerName) {
        throw new Error('اسم المشتري مطلوب للفواتير بقيمة 10,000 د.أ وأكثر')
      }

      // Validate development zone requirements
      if (invoiceCategory === 'development_zone' && (buyerIdType !== 'tax_number' || !buyerIdNumber)) {
        throw new Error('فواتير المناطق التنموية تتطلب الرقم الضريبي للمشتري')
      }

      // Generate invoice
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: selectedOrderId,
          invoiceType,
          invoiceCategory,
          notes,
          buyerName,
          buyerIdType: buyerIdNumber ? buyerIdType : undefined,
          buyerIdNumber: buyerIdNumber || undefined,
          buyerPhone,
          buyerCity,
          buyerPostalCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل في إنشاء الفاتورة')
      }

      setSuccess(true)

      // Redirect to invoice details after 2 seconds
      setTimeout(() => {
        router.push(`/supplier/invoices/${data.invoice.id}`)
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الفاتورة')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totals = calculateTotals()

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          تم إنشاء الفاتورة بنجاح!
        </h3>
        <p className="text-gray-600 mb-6">
          جار تحويلك إلى صفحة الفاتورة...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Order */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          1. اختر الطلب
        </h2>
        <select
          value={selectedOrderId}
          onChange={(e) => handleOrderSelect(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">اختر طلباً...</option>
          {orders.map(order => {
            const contractor = Array.isArray(order.contractor) ? order.contractor[0] : order.contractor
            return (
              <option key={order.id} value={order.id}>
                {order.order_number} - {contractor?.full_name} - {parseFloat(order.total_jod.toString()).toFixed(2)} د.أ
              </option>
            )
          })}
        </select>

        {/* Order Details Preview */}
        {selectedOrder && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">تفاصيل الطلب:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">رقم الطلب:</span>
                <span className="font-medium">{selectedOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عنوان التوصيل:</span>
                <span className="font-medium">{selectedOrder.delivery_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عدد المنتجات:</span>
                <span className="font-medium">{selectedOrder.order_items.length}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-medium">{parseFloat(selectedOrder.total_jod.toString()).toFixed(2)} د.أ</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Invoice Type & Category */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          2. نوع الفاتورة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoice Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الضريبة *
            </label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="income">فاتورة دخل (بدون ضرائب)</option>
              <option value="sales_tax">فاتورة ضريبة مبيعات (16%)</option>
              <option value="special_tax">فاتورة ضريبة خاصة</option>
            </select>
          </div>

          {/* Invoice Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فئة الفاتورة *
            </label>
            <select
              value={invoiceCategory}
              onChange={(e) => setInvoiceCategory(e.target.value as InvoiceCategory)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="local">فاتورة محلية</option>
              <option value="export">فاتورة تصدير (0%)</option>
              <option value="development_zone">مناطق تنموية (0%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 3: Buyer Details */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          3. بيانات المشتري
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المشتري {selectedOrder && parseFloat(selectedOrder.total_jod.toString()) >= 10000 && '*'}
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required={selectedOrder ? parseFloat(selectedOrder.total_jod.toString()) >= 10000 : false}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="الاسم الكامل"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="07XXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المعرّف
            </label>
            <select
              value={buyerIdType}
              onChange={(e) => setBuyerIdType(e.target.value as BuyerIdType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="national_id">الرقم الوطني</option>
              <option value="tax_number">الرقم الضريبي</option>
              <option value="personal_number">الرقم الشخصي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم المعرّف {invoiceCategory === 'development_zone' && '*'}
            </label>
            <input
              type="text"
              value={buyerIdNumber}
              onChange={(e) => setBuyerIdNumber(e.target.value)}
              required={invoiceCategory === 'development_zone' && buyerIdType === 'tax_number'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="رقم المعرّف"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المدينة
            </label>
            <input
              type="text"
              value={buyerCity}
              onChange={(e) => setBuyerCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="المدينة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الرمز البريدي
            </label>
            <input
              type="text"
              value={buyerPostalCode}
              onChange={(e) => setBuyerPostalCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="الرمز البريدي"
            />
          </div>
        </div>
      </div>

      {/* Step 4: Notes */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ملاحظات (اختياري)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="أي ملاحظات إضافية..."
        />
      </div>

      {/* Invoice Preview */}
      {selectedOrder && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">معاينة الفاتورة</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المجموع الفرعي:</span>
              <span className="font-medium">{totals.subtotal} د.أ</span>
            </div>
            {invoiceType !== 'income' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  ضريبة المبيعات ({invoiceCategory === 'local' ? '16%' : '0%'}):
                </span>
                <span className="font-medium">{totals.tax} د.أ</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>الإجمالي:</span>
              <span className="text-blue-600">{totals.total} د.أ</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedOrderId}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>جار الإنشاء...</span>
            </>
          ) : (
            <span>إصدار الفاتورة</span>
          )}
        </button>
      </div>
    </form>
  )
}
