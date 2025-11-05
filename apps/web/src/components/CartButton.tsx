'use client'

import { useCart } from '@/hooks/useCart'

export function CartButton() {
  const { totals, setIsOpen } = useCart()

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
      aria-label="سلة التسوق"
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
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      {totals.itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {totals.itemCount}
        </span>
      )}
    </button>
  )
}
