'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Cart, CartItem, CartTotals } from '@/types/cart'
import { cartStorage } from '@/lib/services/cartStorage'

interface CartContextType {
  cart: Cart
  totals: CartTotals
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const emptyCart: Cart = {
  items: [],
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart)
  const [isOpen, setIsOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = cartStorage.load()
    if (storedCart) {
      setCart(storedCart)
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.items.length > 0) {
      cartStorage.save(cart)
    } else {
      cartStorage.clear()
    }
  }, [cart])

  // Calculate cart totals
  const totals: CartTotals = React.useMemo(() => {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price_per_unit * item.quantity,
      0
    )

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

    const totalWeight = cart.items.reduce(
      (sum, item) => sum + (item.weight_kg_per_unit || 0) * item.quantity,
      0
    )

    const totalVolume = cart.items.reduce(
      (sum, item) => sum + (item.volume_m3_per_unit || 0) * item.quantity,
      0
    )

    const maxLength = Math.max(
      0,
      ...cart.items.map((item) => item.length_m_per_unit || 0)
    )

    const requiresOpenBed = cart.items.some((item) => item.requires_open_bed)

    return {
      subtotal,
      itemCount,
      totalWeight,
      totalVolume,
      maxLength,
      requiresOpenBed,
    }
  }, [cart.items])

  // Add item to cart (supports multi-supplier)
  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    setCart((prevCart) => {
      // Check if item already in cart
      const existingIndex = prevCart.items.findIndex(
        (item) => item.productId === newItem.productId
      )

      if (existingIndex >= 0) {
        // Update quantity
        const updatedItems = [...prevCart.items]
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + newItem.min_order_quantity,
        }

        return {
          ...prevCart,
          items: updatedItems,
        }
      }

      // Add new item
      return {
        items: [...prevCart.items, { ...newItem, quantity: newItem.min_order_quantity }],
      }
    })
  }, [])

  // Remove item from cart
  const removeItem = useCallback((productId: string) => {
    setCart((prevCart) => {
      const updatedItems = prevCart.items.filter(
        (item) => item.productId !== productId
      )

      // If no items left, return empty cart
      if (updatedItems.length === 0) {
        return emptyCart
      }

      return {
        items: updatedItems,
      }
    })
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prevCart) => {
      const updatedItems = prevCart.items.map((item) => {
        if (item.productId === productId) {
          // Enforce minimum order quantity
          const newQuantity = Math.max(item.min_order_quantity, quantity)
          return { ...item, quantity: newQuantity }
        }
        return item
      })

      return {
        items: updatedItems,
      }
    })
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart(emptyCart)
    cartStorage.clear()
  }, [])

  const value: CartContextType = {
    cart,
    totals,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isOpen,
    setIsOpen,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
