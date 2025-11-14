/**
 * Saved Payment Methods Component
 * ================================
 * Display and manage saved payment methods
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Trash2, Plus } from 'lucide-react'

interface SavedMethod {
  id: string
  type: 'card' | 'bank' | 'wallet'
  last4: string
  brand?: string
  holderName: string
  expiryMonth?: string
  expiryYear?: string
  isDefault: boolean
  createdAt: string
}

interface SavedPaymentMethodsProps {
  customerId: string
  onMethodSelected: (methodId: string) => void
  selectedMethodId?: string
  showAddNew?: boolean
  onAddNew?: () => void
}

export function SavedPaymentMethods({
  customerId,
  onMethodSelected,
  selectedMethodId,
  showAddNew = true,
  onAddNew
}: SavedPaymentMethodsProps) {
  const [methods, setMethods] = useState<SavedMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadPaymentMethods()
  }, [customerId])

  async function loadPaymentMethods() {
    try {
      const supabase = createClient()

      // Load saved payment methods
      const { data, error } = await (supabase as any)
        .from('payment_methods')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to SavedMethod format
      const savedMethods: SavedMethod[] = (data || []).map((method: any) => ({
        id: method.id,
        type: method.type,
        last4: method.last4,
        brand: method.brand,
        holderName: method.holder_name,
        expiryMonth: method.expiry_month,
        expiryYear: method.expiry_year,
        isDefault: method.is_default,
        createdAt: method.created_at
      }))

      setMethods(savedMethods)

      // Auto-select default method if none selected
      if (!selectedMethodId && savedMethods.length > 0) {
        const defaultMethod = savedMethods.find(m => m.isDefault) || savedMethods[0]
        onMethodSelected(defaultMethod.id)
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deletePaymentMethod(methodId: string) {
    if (!confirm('هل أنت متأكد من حذف طريقة الدفع هذه؟')) {
      return
    }

    setDeletingId(methodId)

    try {
      const supabase = createClient()

      // Soft delete the payment method
      const { error } = await (supabase as any)
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', methodId)

      if (error) throw error

      // Remove from local state
      setMethods(methods.filter(m => m.id !== methodId))

      // If deleted method was selected, clear selection
      if (selectedMethodId === methodId) {
        onMethodSelected('')
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      alert('فشل حذف طريقة الدفع')
    } finally {
      setDeletingId(null)
    }
  }

  async function setDefaultMethod(methodId: string) {
    try {
      const supabase = createClient()

      // Clear current default
      await (supabase as any)
        .from('payment_methods')
        .update({ is_default: false })
        .eq('customer_id', customerId)

      // Set new default
      const { error } = await (supabase as any)
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)

      if (error) throw error

      // Update local state
      setMethods(methods.map(m => ({
        ...m,
        isDefault: m.id === methodId
      })))

      // Select the new default
      onMethodSelected(methodId)
    } catch (error) {
      console.error('Error setting default payment method:', error)
    }
  }

  function getCardBrandIcon(brand?: string) {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return <span className="text-blue-600 font-bold text-xs">VISA</span>
      case 'mastercard':
        return <span className="text-red-500 font-bold text-xs">MC</span>
      case 'amex':
        return <span className="text-blue-500 font-bold text-xs">AMEX</span>
      default:
        return <CreditCard className="w-4 h-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="border-2 border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-gray-200 rounded"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {methods.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">لا توجد طرق دفع محفوظة</p>
          {showAddNew && onAddNew && (
            <button
              onClick={onAddNew}
              className="mt-4 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
            >
              إضافة طريقة دفع
            </button>
          )}
        </div>
      ) : (
        <>
          {methods.map(method => (
            <div
              key={method.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMethodId === method.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onMethodSelected(method.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Card Brand Icon */}
                  <div className="flex-shrink-0">
                    {getCardBrandIcon(method.brand)}
                  </div>

                  {/* Card Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          افتراضي
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{method.holderName}</span>
                      {method.expiryMonth && method.expiryYear && (
                        <>
                          <span>•</span>
                          <span dir="ltr">{method.expiryMonth}/{method.expiryYear}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Selection Radio */}
                  <div className="relative">
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        selectedMethodId === method.id
                          ? 'border-primary-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedMethodId === method.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary-500"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePaymentMethod(method.id)
                    }}
                    disabled={deletingId === method.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    title="حذف طريقة الدفع"
                  >
                    {deletingId === method.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Make Default Button */}
              {!method.isDefault && selectedMethodId === method.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDefaultMethod(method.id)
                  }}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  جعلها الافتراضية
                </button>
              )}
            </div>
          ))}

          {/* Add New Method */}
          {showAddNew && onAddNew && (
            <button
              onClick={onAddNew}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-400 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-primary-600"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">إضافة طريقة دفع جديدة</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}