'use client'

import { useCart } from '@/hooks/useCart'
import { CartItem } from './CartItem'
import { Button } from '@contractors-mall/ui'
import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import type { SupplierCartGroup } from '@/types/cart'

export function CartDrawer() {
  const { cart, totals, isOpen, setIsOpen, clearCart } = useCart()

  // Group items by supplier
  const supplierGroups = useMemo(() => {
    const groups = cart.items.reduce((acc, item) => {
      const supplierId = item.supplier.id

      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplierId,
          supplierName: item.supplier.business_name,
          supplierNameEn: item.supplier.business_name_en,
          items: [],
          subtotal: 0,
        }
      }

      acc[supplierId].items.push(item)
      acc[supplierId].subtotal += item.price_per_unit * item.quantity

      return acc
    }, {} as Record<string, SupplierCartGroup>)

    return Object.values(groups)
  }, [cart.items])

  // Close drawer when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full w-full max-w-md bg-white z-50 shadow-xl transform transition-transform"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">سلة التسوق</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="إغلاق"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-4rem)]">
          {cart.items.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg
                className="h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                السلة فارغة
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                ابدأ بإضافة المنتجات إلى سلة التسوق
              </p>
              <Link href="/products" onClick={() => setIsOpen(false)}>
                <Button variant="primary">تصفح المنتجات</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Multi-Supplier Notice */}
              {supplierGroups.length > 1 && (
                <div className="p-3 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-start gap-2 text-sm">
                    <svg
                      className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-blue-900 text-xs leading-relaxed">
                      سيتم تقسيم طلبك إلى {supplierGroups.length} طلبات منفصلة (واحد لكل مورد). كل مورد سيقوم بالتوصيل بشكل مستقل.
                      <br />
                      <span className="text-blue-700">Your order will be split into {supplierGroups.length} separate orders (one per supplier). Each supplier will deliver independently.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Grouped Items by Supplier */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {supplierGroups.map((group) => (
                  <div key={group.supplierId} className="space-y-3">
                    {/* Supplier Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-primary-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span className="font-medium text-gray-900 text-sm">
                          {group.supplierName}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-primary-600">
                        {group.subtotal.toFixed(2)} د.أ
                      </span>
                    </div>

                    {/* Supplier Items */}
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <CartItem key={item.productId} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">المجموع الفرعي:</span>
                    <span className="font-medium text-gray-900">
                      {totals.subtotal.toFixed(2)} د.أ
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">رسوم التوصيل:</span>
                    <span className="text-sm text-gray-500">
                      تحسب عند الدفع
                    </span>
                  </div>
                  {totals.totalWeight > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>الوزن الإجمالي:</span>
                      <span>{totals.totalWeight.toFixed(1)} كجم</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Link
                    href="/checkout/address"
                    onClick={() => setIsOpen(false)}
                    className="block"
                  >
                    <Button variant="primary" className="w-full">
                      إكمال الطلب
                    </Button>
                  </Link>

                  <button
                    onClick={() => {
                      if (
                        window.confirm('هل أنت متأكد من إفراغ السلة؟')
                      ) {
                        clearCart()
                        setIsOpen(false)
                      }
                    }}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    إفراغ السلة
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
