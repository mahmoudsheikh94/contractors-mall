/**
 * Unit tests for cartStorage service
 */

import { cartStorage } from '../cartStorage'
import { Cart } from '@/types/cart'
import { mockCartItems } from '@/__tests__/fixtures'

// Mock console.error to suppress error logs in tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('cartStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('load', () => {
    it('should return null when localStorage is empty', () => {
      const result = cartStorage.load()
      expect(result).toBeNull()
    })

    it('should load cart from localStorage', () => {
      const mockCart: Cart = {
        items: mockCartItems,
      }

      localStorage.setItem('contractors_mall_cart', JSON.stringify(mockCart))

      const result = cartStorage.load()

      expect(result).toEqual(mockCart)
      expect(result?.items).toHaveLength(2)
    })

    it('should return null when cart data is invalid JSON', () => {
      localStorage.setItem('contractors_mall_cart', 'invalid json {]')

      const result = cartStorage.load()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading cart from localStorage:',
        expect.any(Error)
      )
    })

    it('should handle empty items array', () => {
      const emptyCart: Cart = {
        items: [],
      }

      localStorage.setItem('contractors_mall_cart', JSON.stringify(emptyCart))

      const result = cartStorage.load()

      expect(result).toEqual(emptyCart)
      expect(result?.items).toHaveLength(0)
    })

    it('should preserve cart item properties', () => {
      const mockCart: Cart = {
        items: [mockCartItems[0]],
      }

      localStorage.setItem('contractors_mall_cart', JSON.stringify(mockCart))

      const result = cartStorage.load()

      expect(result?.items[0]).toHaveProperty('productId')
      expect(result?.items[0]).toHaveProperty('name_ar')
      expect(result?.items[0]).toHaveProperty('price_per_unit')
      expect(result?.items[0]).toHaveProperty('quantity')
      expect(result?.items[0]).toHaveProperty('supplier')
    })
  })

  describe('save', () => {
    it('should save cart to localStorage', () => {
      const mockCart: Cart = {
        items: mockCartItems,
      }

      cartStorage.save(mockCart)

      const stored = localStorage.getItem('contractors_mall_cart')
      expect(stored).not.toBeNull()

      const parsed = JSON.parse(stored!)
      expect(parsed).toEqual(mockCart)
    })

    it('should save empty cart', () => {
      const emptyCart: Cart = {
        items: [],
      }

      cartStorage.save(emptyCart)

      const stored = localStorage.getItem('contractors_mall_cart')
      expect(stored).not.toBeNull()

      const parsed = JSON.parse(stored!)
      expect(parsed).toEqual(emptyCart)
    })

    it('should overwrite existing cart data', () => {
      const cart1: Cart = {
        items: [mockCartItems[0]],
      }
      const cart2: Cart = {
        items: [mockCartItems[1]],
      }

      cartStorage.save(cart1)
      cartStorage.save(cart2)

      const stored = localStorage.getItem('contractors_mall_cart')
      const parsed = JSON.parse(stored!)

      expect(parsed).toEqual(cart2)
      expect(parsed.items).toHaveLength(1)
      expect(parsed.items[0].productId).toBe(mockCartItems[1].productId)
    })

    it('should serialize complex cart objects', () => {
      const complexCart: Cart = {
        items: mockCartItems.map((item) => ({
          ...item,
          supplier: {
            id: item.supplier.id,
            business_name: 'Test Supplier',
            business_name_en: 'Test Supplier EN',
          },
        })),
      }

      cartStorage.save(complexCart)

      const stored = localStorage.getItem('contractors_mall_cart')
      const parsed = JSON.parse(stored!)

      expect(parsed.items[0].supplier).toBeDefined()
      expect(parsed.items[0].supplier.id).toBe(mockCartItems[0].supplier.id)
    })
  })

  describe('clear', () => {
    it('should remove cart from localStorage', () => {
      const mockCart: Cart = {
        items: mockCartItems,
      }

      // First save a cart
      localStorage.setItem('contractors_mall_cart', JSON.stringify(mockCart))

      // Verify it's there
      expect(localStorage.getItem('contractors_mall_cart')).not.toBeNull()

      // Clear it
      cartStorage.clear()

      // Verify it's gone
      expect(localStorage.getItem('contractors_mall_cart')).toBeNull()
    })

    it('should not throw error when clearing empty localStorage', () => {
      expect(() => cartStorage.clear()).not.toThrow()
    })

    it('should only remove cart key, not other data', () => {
      localStorage.setItem('other_key', 'other_value')
      localStorage.setItem('contractors_mall_cart', JSON.stringify({ items: [] }))

      cartStorage.clear()

      expect(localStorage.getItem('contractors_mall_cart')).toBeNull()
      expect(localStorage.getItem('other_key')).toBe('other_value')
    })
  })

  describe('Integration', () => {
    it('should complete save-load-clear cycle', () => {
      const mockCart: Cart = {
        items: mockCartItems,
      }

      // Save
      cartStorage.save(mockCart)

      // Load
      const loaded = cartStorage.load()
      expect(loaded).toEqual(mockCart)

      // Clear
      cartStorage.clear()

      // Load again
      const loadedAfterClear = cartStorage.load()
      expect(loadedAfterClear).toBeNull()
    })

    it('should handle multiple save operations', () => {
      const cart1: Cart = { items: [mockCartItems[0]] }
      const cart2: Cart = { items: [mockCartItems[0], mockCartItems[1]] }
      const cart3: Cart = { items: mockCartItems }

      cartStorage.save(cart1)
      expect(cartStorage.load()?.items).toHaveLength(1)

      cartStorage.save(cart2)
      expect(cartStorage.load()?.items).toHaveLength(2)

      cartStorage.save(cart3)
      expect(cartStorage.load()?.items).toHaveLength(mockCartItems.length)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large cart', () => {
      const largeCart: Cart = {
        items: Array(100)
          .fill(null)
          .map((_, i) => ({
            ...mockCartItems[0],
            productId: `prod-${i}`,
          })),
      }

      cartStorage.save(largeCart)
      const loaded = cartStorage.load()

      expect(loaded?.items).toHaveLength(100)
    })

    it('should handle cart with special characters', () => {
      const specialCart: Cart = {
        items: [
          {
            ...mockCartItems[0],
            name_ar: 'أسمنت "مقاوم" للحرارة & الرطوبة',
            name_en: "Cement with 'special' chars <>&",
          },
        ],
      }

      cartStorage.save(specialCart)
      const loaded = cartStorage.load()

      expect(loaded?.items[0].name_ar).toBe('أسمنت "مقاوم" للحرارة & الرطوبة')
      expect(loaded?.items[0].name_en).toBe("Cement with 'special' chars <>&")
    })

    it('should handle null and undefined values', () => {
      const cartWithNulls: Cart = {
        items: [
          {
            ...mockCartItems[0],
            length_m_per_unit: undefined,
            weight_kg_per_unit: undefined,
            volume_m3_per_unit: undefined,
          },
        ],
      }

      cartStorage.save(cartWithNulls)
      const loaded = cartStorage.load()

      expect(loaded?.items[0].length_m_per_unit).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle quota exceeded error gracefully', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      const mockCart: Cart = { items: mockCartItems }

      expect(() => cartStorage.save(mockCart)).not.toThrow()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving cart to localStorage:',
        expect.any(Error)
      )

      // Restore original
      Storage.prototype.setItem = originalSetItem
    })

    it('should handle getItem error gracefully', () => {
      // Mock localStorage.getItem to throw error
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('Storage access denied')
      })

      const result = cartStorage.load()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()

      // Restore original
      Storage.prototype.getItem = originalGetItem
    })
  })
})
