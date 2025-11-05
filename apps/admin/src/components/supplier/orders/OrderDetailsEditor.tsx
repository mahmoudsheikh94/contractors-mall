'use client'

import { useState } from 'react'

interface OrderDetailsEditorProps {
  orderId: string
  initialValues: {
    delivery_instructions?: string | null
    special_requests?: string | null
    internal_reference?: string | null
  }
  onUpdate?: () => void
}

export function OrderDetailsEditor({ orderId, initialValues, onUpdate }: OrderDetailsEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deliveryInstructions, setDeliveryInstructions] = useState(initialValues.delivery_instructions || '')
  const [specialRequests, setSpecialRequests] = useState(initialValues.special_requests || '')
  const [internalReference, setInternalReference] = useState(initialValues.internal_reference || '')

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/supplier/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_instructions: deliveryInstructions,
          special_requests: specialRequests,
          internal_reference: internalReference,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order')
      }

      setIsEditing(false)
      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      console.error('Error updating order:', err)
      alert(err.message || 'فشل تحديث الطلب')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDeliveryInstructions(initialValues.delivery_instructions || '')
    setSpecialRequests(initialValues.special_requests || '')
    setInternalReference(initialValues.internal_reference || '')
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">تفاصيل إضافية</h2>
          <p className="text-sm text-gray-600 mt-1">
            معلومات إضافية عن الطلب والتوصيل
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            تعديل
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Delivery Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تعليمات التوصيل
          </label>
          {isEditing ? (
            <textarea
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="أدخل تعليمات خاصة للتوصيل (اختياري)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={saving}
            />
          ) : (
            <div className="text-gray-900 whitespace-pre-line">
              {deliveryInstructions || (
                <span className="text-gray-400 italic">لا توجد تعليمات</span>
              )}
            </div>
          )}
        </div>

        {/* Special Requests */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            طلبات خاصة
          </label>
          {isEditing ? (
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="أدخل أي طلبات أو ملاحظات خاصة (اختياري)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={saving}
            />
          ) : (
            <div className="text-gray-900 whitespace-pre-line">
              {specialRequests || (
                <span className="text-gray-400 italic">لا توجد طلبات خاصة</span>
              )}
            </div>
          )}
        </div>

        {/* Internal Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الرقم المرجعي الداخلي
            <span className="text-xs text-gray-500 mr-2">(للاستخدام الداخلي فقط)</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              value={internalReference}
              onChange={(e) => setInternalReference(e.target.value)}
              placeholder="رقم مرجعي داخلي (اختياري)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={saving}
            />
          ) : (
            <div className="text-gray-900">
              {internalReference || (
                <span className="text-gray-400 italic">لا يوجد رقم مرجعي</span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons (when editing) */}
        {isEditing && (
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
