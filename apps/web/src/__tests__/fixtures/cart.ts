/**
 * Mock cart data for testing
 */

import { mockProducts } from './products'

export const mockCartItems = [
  {
    productId: mockProducts[0].product_id,
    name_ar: mockProducts[0].name_ar,
    name_en: mockProducts[0].name_en,
    unit_ar: 'كيس',
    unit_en: 'bag',
    price_per_unit: mockProducts[0].price_per_unit,
    quantity: 10,
    min_order_quantity: 10,
    weight_kg_per_unit: mockProducts[0].weight_per_unit_kg,
    volume_m3_per_unit: mockProducts[0].volume_per_unit_m3,
    length_m_per_unit: mockProducts[0].length_per_unit_m,
    requires_open_bed: mockProducts[0].requires_open_bed,
    supplier: {
      id: mockProducts[0].supplier_id,
      business_name: mockProducts[0].supplier.business_name_ar,
      business_name_en: mockProducts[0].supplier.business_name_en,
    },
  },
  {
    productId: mockProducts[1].product_id,
    name_ar: mockProducts[1].name_ar,
    name_en: mockProducts[1].name_en,
    unit_ar: 'طن',
    unit_en: 'ton',
    price_per_unit: mockProducts[1].price_per_unit,
    quantity: 2,
    min_order_quantity: 1,
    weight_kg_per_unit: mockProducts[1].weight_per_unit_kg,
    volume_m3_per_unit: mockProducts[1].volume_per_unit_m3,
    length_m_per_unit: mockProducts[1].length_per_unit_m,
    requires_open_bed: mockProducts[1].requires_open_bed,
    supplier: {
      id: mockProducts[1].supplier_id,
      business_name: mockProducts[1].supplier.business_name_ar,
      business_name_en: mockProducts[1].supplier.business_name_en,
    },
  },
]

// Multi-supplier cart (items from different suppliers)
export const mockMultiSupplierCartItems = [
  ...mockCartItems,
  {
    productId: mockProducts[2].product_id,
    name_ar: mockProducts[2].name_ar,
    name_en: mockProducts[2].name_en,
    unit_ar: 'متر مكعب',
    unit_en: 'm3',
    price_per_unit: mockProducts[2].price_per_unit,
    quantity: 5,
    min_order_quantity: 5,
    weight_kg_per_unit: mockProducts[2].weight_per_unit_kg,
    volume_m3_per_unit: mockProducts[2].volume_per_unit_m3,
    length_m_per_unit: mockProducts[2].length_per_unit_m,
    requires_open_bed: mockProducts[2].requires_open_bed,
    supplier: {
      id: mockProducts[2].supplier_id,
      business_name: mockProducts[2].supplier.business_name_ar,
      business_name_en: mockProducts[2].supplier.business_name_en,
    },
  },
]

// Single supplier cart
export const mockSingleSupplierCartItems = mockCartItems.slice(0, 1)

// Empty cart
export const mockEmptyCart: any[] = []

// Cart totals helper
export function calculateCartTotal(items: typeof mockCartItems) {
  return items.reduce((total, item) => total + item.price_per_unit * item.quantity, 0)
}

// Mock cart state
export const mockCartState = {
  items: mockCartItems,
  totalItems: mockCartItems.reduce((sum, item) => sum + item.quantity, 0),
  subtotal: calculateCartTotal(mockCartItems),
}
