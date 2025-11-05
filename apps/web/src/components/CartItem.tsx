'use client'

import { CartItem as CartItemType } from '@/types/cart'
import { useCart } from '@/hooks/useCart'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart()

  const handleIncrease = () => {
    updateQuantity(item.productId, item.quantity + 1)
  }

  const handleDecrease = () => {
    const newQuantity = item.quantity - 1
    if (newQuantity < item.min_order_quantity) {
      removeItem(item.productId)
    } else {
      updateQuantity(item.productId, newQuantity)
    }
  }

  const itemTotal = item.price_per_unit * item.quantity

  return (
    <div className="flex items-start gap-4 border-b border-gray-200 pb-4">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {item.name_ar}
        </h4>
        <p className="text-xs text-gray-500 mt-1">{item.name_en}</p>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-primary-600">
            {item.price_per_unit.toFixed(2)} د.أ
          </span>
          <span className="text-xs text-gray-500">/ {item.unit_ar}</span>
        </div>

        {/* Specs */}
        {(item.weight_kg_per_unit || item.volume_m3_per_unit) && (
          <div className="mt-1 flex gap-3 text-xs text-gray-600">
            {item.weight_kg_per_unit && (
              <span>{item.weight_kg_per_unit} كجم</span>
            )}
            {item.volume_m3_per_unit && (
              <span>{item.volume_m3_per_unit} م³</span>
            )}
          </div>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 bg-gray-100 rounded-md">
          <button
            onClick={handleIncrease}
            className="px-3 py-1 text-gray-700 hover:text-primary-600 transition-colors"
            aria-label="زيادة الكمية"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center">
            {item.quantity}
          </span>

          <button
            onClick={handleDecrease}
            className="px-3 py-1 text-gray-700 hover:text-red-600 transition-colors"
            aria-label="تقليل الكمية"
          >
            {item.quantity <= item.min_order_quantity ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
          </button>
        </div>

        {/* Item Total */}
        <div className="text-sm font-semibold text-gray-900">
          {itemTotal.toFixed(2)} د.أ
        </div>

        {item.min_order_quantity > 1 && (
          <p className="text-xs text-gray-500">
            الحد الأدنى: {item.min_order_quantity}
          </p>
        )}
      </div>
    </div>
  )
}
