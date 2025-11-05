/**
 * Unit tests for vehicleEstimate utility functions
 */

import { cartItemsToEstimateItems, groupCartItemsBySupplier } from '../vehicleEstimate'
import { mockCartItems, mockMultiSupplierCartItems } from '@/__tests__/fixtures'
import { CartItem } from '@/types/cart'

describe('vehicleEstimate utilities', () => {
  describe('cartItemsToEstimateItems', () => {
    it('should convert cart items to estimate items format', () => {
      const result = cartItemsToEstimateItems(mockCartItems)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('weight_kg')
      expect(result[0]).toHaveProperty('volume_m3')
      expect(result[0]).toHaveProperty('length_m')
      expect(result[0]).toHaveProperty('requires_open_bed')
    })

    it('should calculate weight correctly', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          weight_kg_per_unit: 50,
          quantity: 10,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      // 50 kg * 10 = 500 kg
      expect(result[0].weight_kg).toBe(500)
    })

    it('should calculate volume correctly', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          volume_m3_per_unit: 0.04,
          quantity: 25,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      // 0.04 m³ * 25 = 1 m³
      expect(result[0].volume_m3).toBe(1)
    })

    it('should preserve length value', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          length_m_per_unit: 12,
          quantity: 5,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      // Length is NOT multiplied by quantity
      expect(result[0].length_m).toBe(12)
    })

    it('should preserve requires_open_bed flag', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          requires_open_bed: true,
          quantity: 1,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      expect(result[0].requires_open_bed).toBe(true)
    })

    it('should handle missing weight as 0', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          weight_kg_per_unit: undefined,
          quantity: 10,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      expect(result[0].weight_kg).toBe(0)
    })

    it('should handle missing volume as 0', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          volume_m3_per_unit: undefined,
          quantity: 10,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      expect(result[0].volume_m3).toBe(0)
    })

    it('should handle missing length as 0', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          length_m_per_unit: undefined,
          quantity: 10,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      expect(result[0].length_m).toBe(0)
    })

    it('should handle empty array', () => {
      const result = cartItemsToEstimateItems([])

      expect(result).toEqual([])
    })

    it('should handle multiple items', () => {
      const result = cartItemsToEstimateItems(mockCartItems)

      expect(result).toHaveLength(mockCartItems.length)
    })

    it('should calculate totals for mixed items', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          weight_kg_per_unit: 50,
          volume_m3_per_unit: 0.04,
          quantity: 10,
        },
        {
          ...mockCartItems[1],
          weight_kg_per_unit: 1000,
          volume_m3_per_unit: 0.15,
          quantity: 2,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      expect(result[0].weight_kg).toBe(500) // 50 * 10
      expect(result[0].volume_m3).toBe(0.4) // 0.04 * 10

      expect(result[1].weight_kg).toBe(2000) // 1000 * 2
      expect(result[1].volume_m3).toBe(0.3) // 0.15 * 2
    })

    it('should handle decimal quantities', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          weight_kg_per_unit: 50,
          volume_m3_per_unit: 0.04,
          quantity: 2.5,
        },
      ]

      const result = cartItemsToEstimateItems(items)

      expect(result[0].weight_kg).toBe(125) // 50 * 2.5
      expect(result[0].volume_m3).toBe(0.1) // 0.04 * 2.5
    })
  })

  describe('groupCartItemsBySupplier', () => {
    it('should group items by supplier', () => {
      const result = groupCartItemsBySupplier(mockMultiSupplierCartItems)

      const supplierIds = Object.keys(result)
      expect(supplierIds.length).toBeGreaterThan(1) // Multi-supplier cart
    })

    it('should create correct group structure', () => {
      const result = groupCartItemsBySupplier(mockCartItems)

      const firstSupplierId = Object.keys(result)[0]
      const group = result[firstSupplierId]

      expect(group).toHaveProperty('supplierId')
      expect(group).toHaveProperty('supplierName')
      expect(group).toHaveProperty('supplierNameEn')
      expect(group).toHaveProperty('items')
      expect(Array.isArray(group.items)).toBe(true)
    })

    it('should preserve supplier information', () => {
      const result = groupCartItemsBySupplier(mockCartItems)

      const firstSupplierId = Object.keys(result)[0]
      const group = result[firstSupplierId]

      expect(group.supplierId).toBe(mockCartItems[0].supplier.id)
      expect(group.supplierName).toBe(mockCartItems[0].supplier.business_name)
      expect(group.supplierNameEn).toBe(mockCartItems[0].supplier.business_name_en)
    })

    it('should group all items from same supplier together', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          productId: 'prod-1',
          supplier: {
            id: 'supp-001',
            business_name: 'مورد 1',
            business_name_en: 'Supplier 1',
          },
        },
        {
          ...mockCartItems[1],
          productId: 'prod-2',
          supplier: {
            id: 'supp-001',
            business_name: 'مورد 1',
            business_name_en: 'Supplier 1',
          },
        },
      ]

      const result = groupCartItemsBySupplier(items)

      expect(Object.keys(result)).toHaveLength(1)
      expect(result['supp-001'].items).toHaveLength(2)
    })

    it('should separate items from different suppliers', () => {
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          supplier: {
            id: 'supp-001',
            business_name: 'مورد 1',
            business_name_en: 'Supplier 1',
          },
        },
        {
          ...mockCartItems[1],
          supplier: {
            id: 'supp-002',
            business_name: 'مورد 2',
            business_name_en: 'Supplier 2',
          },
        },
      ]

      const result = groupCartItemsBySupplier(items)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['supp-001'].items).toHaveLength(1)
      expect(result['supp-002'].items).toHaveLength(1)
    })

    it('should handle empty array', () => {
      const result = groupCartItemsBySupplier([])

      expect(result).toEqual({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle single item', () => {
      const result = groupCartItemsBySupplier([mockCartItems[0]])

      const supplierIds = Object.keys(result)
      expect(supplierIds).toHaveLength(1)
      expect(result[supplierIds[0]].items).toHaveLength(1)
    })

    it('should maintain item order within groups', () => {
      const items: CartItem[] = [
        { ...mockCartItems[0], productId: 'prod-1', supplier: mockCartItems[0].supplier },
        { ...mockCartItems[1], productId: 'prod-2', supplier: mockCartItems[0].supplier },
        { ...mockCartItems[0], productId: 'prod-3', supplier: mockCartItems[0].supplier },
      ]

      const result = groupCartItemsBySupplier(items)

      const supplierId = Object.keys(result)[0]
      expect(result[supplierId].items[0].productId).toBe('prod-1')
      expect(result[supplierId].items[1].productId).toBe('prod-2')
      expect(result[supplierId].items[2].productId).toBe('prod-3')
    })

    it('should handle items with same supplier ID but different names', () => {
      // This shouldn't happen in practice, but testing edge case
      const items: CartItem[] = [
        {
          ...mockCartItems[0],
          supplier: {
            id: 'supp-001',
            business_name: 'مورد الأسمنت',
            business_name_en: 'Cement Supplier',
          },
        },
        {
          ...mockCartItems[1],
          supplier: {
            id: 'supp-001',
            business_name: 'اسم مختلف',
            business_name_en: 'Different Name',
          },
        },
      ]

      const result = groupCartItemsBySupplier(items)

      expect(Object.keys(result)).toHaveLength(1)
      // Should use first item's supplier name
      expect(result['supp-001'].supplierName).toBe('مورد الأسمنت')
    })

    it('should work with multi-supplier fixture', () => {
      const result = groupCartItemsBySupplier(mockMultiSupplierCartItems)

      const supplierIds = Object.keys(result)

      // Verify each group has the correct structure
      supplierIds.forEach((supplierId) => {
        const group = result[supplierId]
        expect(group.supplierId).toBe(supplierId)
        expect(group.items.length).toBeGreaterThan(0)

        // Verify all items in group have same supplier ID
        group.items.forEach((item) => {
          expect(item.supplier.id).toBe(supplierId)
        })
      })
    })
  })

  describe('Integration', () => {
    it('should work together for multi-supplier estimation', () => {
      // Group items by supplier
      const groups = groupCartItemsBySupplier(mockMultiSupplierCartItems)

      // Convert each group's items to estimate format
      const estimates = Object.keys(groups).map((supplierId) => ({
        supplierId,
        estimateItems: cartItemsToEstimateItems(groups[supplierId].items),
      }))

      // Verify structure
      estimates.forEach((estimate) => {
        expect(estimate).toHaveProperty('supplierId')
        expect(estimate).toHaveProperty('estimateItems')
        expect(Array.isArray(estimate.estimateItems)).toBe(true)

        estimate.estimateItems.forEach((item) => {
          expect(item).toHaveProperty('weight_kg')
          expect(item).toHaveProperty('volume_m3')
          expect(item).toHaveProperty('length_m')
          expect(item).toHaveProperty('requires_open_bed')
        })
      })
    })

    it('should handle complete checkout flow data transformation', () => {
      const grouped = groupCartItemsBySupplier(mockMultiSupplierCartItems)

      const checkoutData = Object.values(grouped).map((group) => ({
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        items: cartItemsToEstimateItems(group.items),
      }))

      expect(checkoutData.length).toBeGreaterThan(0)
      checkoutData.forEach((data) => {
        expect(data.supplierId).toBeDefined()
        expect(data.supplierName).toBeDefined()
        expect(data.items).toBeDefined()
      })
    })
  })
})
