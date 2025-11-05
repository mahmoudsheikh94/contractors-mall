import { Cart } from '@/types/cart'

const CART_STORAGE_KEY = 'contractors_mall_cart'

export const cartStorage = {
  // Load cart from localStorage
  load: (): Cart | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (!stored) return null

      const cart = JSON.parse(stored) as Cart
      return cart
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
      return null
    }
  },

  // Save cart to localStorage
  save: (cart: Cart): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  },

  // Clear cart from localStorage
  clear: (): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error)
    }
  },
}
