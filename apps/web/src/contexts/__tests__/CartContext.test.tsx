/**
 * Unit tests for CartContext
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { CartProvider, useCart } from '../CartContext'
import { CartItem } from '@/types/cart'
import { mockLocalStorage } from '@/__tests__/utils/test-utils'

// Mock localStorage
const mockStorage = mockLocalStorage()
Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true,
})

// Sample cart items for testing
const mockItem1: Omit<CartItem, 'quantity'> = {
  productId: 'prod-001',
  name_ar: 'أسمنت مقاوم',
  name_en: 'Resistant Cement',
  unit_ar: 'كيس',
  unit_en: 'bag',
  price_per_unit: 4.5,
  min_order_quantity: 10,
  weight_kg_per_unit: 50,
  volume_m3_per_unit: 0.04,
  length_m_per_unit: undefined,
  requires_open_bed: false,
  supplier: {
    id: 'supp-001',
    business_name: 'مورد الأسمنت',
    business_name_en: 'Cement Supplier',
  },
}

const mockItem2: Omit<CartItem, 'quantity'> = {
  productId: 'prod-002',
  name_ar: 'حديد تسليح',
  name_en: 'Rebar',
  unit_ar: 'طن',
  unit_en: 'ton',
  price_per_unit: 550,
  min_order_quantity: 1,
  weight_kg_per_unit: 1000,
  volume_m3_per_unit: 0.15,
  length_m_per_unit: 12,
  requires_open_bed: true,
  supplier: {
    id: 'supp-001',
    business_name: 'مورد الأسمنت',
    business_name_en: 'Cement Supplier',
  },
}

const mockItem3: Omit<CartItem, 'quantity'> = {
  productId: 'prod-003',
  name_ar: 'رمل ناعم',
  name_en: 'Fine Sand',
  unit_ar: 'متر مكعب',
  unit_en: 'm3',
  price_per_unit: 25,
  min_order_quantity: 5,
  weight_kg_per_unit: 1600,
  volume_m3_per_unit: 1,
  length_m_per_unit: undefined,
  requires_open_bed: true,
  supplier: {
    id: 'supp-002',
    business_name: 'مورد الرمل',
    business_name_en: 'Sand Supplier',
  },
}

describe('CartContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    mockStorage.clear()
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with empty cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      expect(result.current.cart.items).toEqual([])
      expect(result.current.totals.itemCount).toBe(0)
      expect(result.current.totals.subtotal).toBe(0)
    })

    it('should load cart from localStorage on mount', () => {
      // Pre-populate localStorage
      const savedCart = {
        items: [{ ...mockItem1, quantity: 10 }],
      }
      mockStorage.setItem('contractors_mall_cart', JSON.stringify(savedCart))

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      expect(result.current.cart.items).toHaveLength(1)
      expect(result.current.cart.items[0].productId).toBe('prod-001')
      expect(result.current.cart.items[0].quantity).toBe(10)
    })
  })

  describe('addItem', () => {
    it('should add new item to cart with min_order_quantity', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      expect(result.current.cart.items).toHaveLength(1)
      expect(result.current.cart.items[0].productId).toBe('prod-001')
      expect(result.current.cart.items[0].quantity).toBe(10) // min_order_quantity
    })

    it('should increase quantity when adding existing item', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      expect(result.current.cart.items[0].quantity).toBe(10)

      act(() => {
        result.current.addItem(mockItem1)
      })

      expect(result.current.cart.items).toHaveLength(1)
      expect(result.current.cart.items[0].quantity).toBe(20) // 10 + 10
    })

    it('should support multi-supplier cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // supplier 1
        result.current.addItem(mockItem3) // supplier 2
      })

      expect(result.current.cart.items).toHaveLength(2)
      expect(result.current.cart.items[0].supplier.id).toBe('supp-001')
      expect(result.current.cart.items[1].supplier.id).toBe('supp-002')
    })

    it('should save to localStorage after adding item', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      // Wait for useEffect to run
      waitFor(() => {
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          'contractors_mall_cart',
          expect.any(String)
        )
      })
    })
  })

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
        result.current.addItem(mockItem2)
      })

      expect(result.current.cart.items).toHaveLength(2)

      act(() => {
        result.current.removeItem('prod-001')
      })

      expect(result.current.cart.items).toHaveLength(1)
      expect(result.current.cart.items[0].productId).toBe('prod-002')
    })

    it('should clear localStorage when removing last item', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      act(() => {
        result.current.removeItem('prod-001')
      })

      expect(result.current.cart.items).toHaveLength(0)

      waitFor(() => {
        expect(mockStorage.clear).toHaveBeenCalled()
      })
    })
  })

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      expect(result.current.cart.items[0].quantity).toBe(10)

      act(() => {
        result.current.updateQuantity('prod-001', 20)
      })

      expect(result.current.cart.items[0].quantity).toBe(20)
    })

    it('should enforce minimum order quantity', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // min_order_quantity = 10
      })

      act(() => {
        result.current.updateQuantity('prod-001', 5) // Try to set below minimum
      })

      expect(result.current.cart.items[0].quantity).toBe(10) // Should remain at minimum
    })

    it('should not update non-existent item', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      const initialQuantity = result.current.cart.items[0].quantity

      act(() => {
        result.current.updateQuantity('non-existent-id', 100)
      })

      expect(result.current.cart.items[0].quantity).toBe(initialQuantity)
    })
  })

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
        result.current.addItem(mockItem2)
        result.current.addItem(mockItem3)
      })

      expect(result.current.cart.items).toHaveLength(3)

      act(() => {
        result.current.clearCart()
      })

      expect(result.current.cart.items).toHaveLength(0)
      expect(result.current.totals.itemCount).toBe(0)
      expect(result.current.totals.subtotal).toBe(0)
    })

    it('should clear localStorage', () => {
      const { result} = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1)
      })

      act(() => {
        result.current.clearCart()
      })

      // cartStorage.clear() calls localStorage.removeItem, not localStorage.clear
      expect(mockStorage.removeItem).toHaveBeenCalledWith('contractors_mall_cart')
    })
  })

  describe('Cart Totals', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // 4.5 * 10 = 45
        result.current.addItem(mockItem2) // 550 * 1 = 550
      })

      expect(result.current.totals.subtotal).toBe(595)
    })

    it('should calculate itemCount correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // quantity: 10
        result.current.addItem(mockItem2) // quantity: 1
        result.current.addItem(mockItem3) // quantity: 5
      })

      expect(result.current.totals.itemCount).toBe(16)
    })

    it('should calculate totalWeight correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // 50 * 10 = 500
        result.current.addItem(mockItem2) // 1000 * 1 = 1000
      })

      expect(result.current.totals.totalWeight).toBe(1500)
    })

    it('should calculate totalVolume correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // 0.04 * 10 = 0.4
        result.current.addItem(mockItem3) // 1 * 5 = 5
      })

      expect(result.current.totals.totalVolume).toBeCloseTo(5.4, 1)
    })

    it('should calculate maxLength correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // no length
        result.current.addItem(mockItem2) // 12m
        result.current.addItem(mockItem3) // no length
      })

      expect(result.current.totals.maxLength).toBe(12)
    })

    it('should detect if open bed is required', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      act(() => {
        result.current.addItem(mockItem1) // requires_open_bed: false
      })

      expect(result.current.totals.requiresOpenBed).toBe(false)

      act(() => {
        result.current.addItem(mockItem2) // requires_open_bed: true
      })

      expect(result.current.totals.requiresOpenBed).toBe(true)
    })
  })

  describe('Drawer State', () => {
    it('should manage drawer open state', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.setIsOpen(true)
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.setIsOpen(false)
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when useCart is used outside CartProvider', () => {
      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => {
        renderHook(() => useCart())
      }).toThrow('useCart must be used within a CartProvider')

      consoleSpy.mockRestore()
    })
  })
})
