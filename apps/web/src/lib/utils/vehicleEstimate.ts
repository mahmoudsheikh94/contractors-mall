import type { CartItem } from '@/types/cart'
import type { VehicleEstimateItem } from '@/types/vehicle'

/**
 * Convert cart items to vehicle estimate items format
 * Aggregates quantities for weight and volume calculation
 */
export function cartItemsToEstimateItems(items: CartItem[]): VehicleEstimateItem[] {
  return items.map((item) => ({
    weight_kg: (item.weight_kg_per_unit || 0) * item.quantity,
    volume_m3: (item.volume_m3_per_unit || 0) * item.quantity,
    length_m: item.length_m_per_unit || 0,
    requires_open_bed: item.requires_open_bed || false,
  }))
}

/**
 * Group cart items by supplier for multi-supplier checkout
 */
export function groupCartItemsBySupplier(items: CartItem[]) {
  return items.reduce((acc, item) => {
    const supplierId = item.supplier.id

    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplierId,
        supplierName: item.supplier.business_name,
        supplierNameEn: item.supplier.business_name_en,
        items: [],
      }
    }

    acc[supplierId].items.push(item)

    return acc
  }, {} as Record<string, { supplierId: string; supplierName: string; supplierNameEn: string; items: CartItem[] }>)
}
