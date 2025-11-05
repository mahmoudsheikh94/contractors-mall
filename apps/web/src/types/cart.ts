// Cart types
export interface CartItem {
  productId: string
  name_ar: string
  name_en: string
  unit_ar: string
  unit_en: string
  price_per_unit: number
  quantity: number
  min_order_quantity: number
  weight_kg_per_unit?: number | null
  volume_m3_per_unit?: number | null
  length_m_per_unit?: number | null
  requires_open_bed: boolean
  supplier: {
    id: string
    business_name: string
    business_name_en: string
  }
}

export interface Cart {
  items: CartItem[]
}

// Helper type for grouping cart items by supplier
export interface SupplierCartGroup {
  supplierId: string
  supplierName: string
  supplierNameEn: string
  items: CartItem[]
  subtotal: number
}

export interface CartTotals {
  subtotal: number
  itemCount: number
  totalWeight: number
  totalVolume: number
  maxLength: number
  requiresOpenBed: boolean
}

export interface VehicleEstimate {
  vehicle_class_id: string
  vehicle_name_ar: string
  vehicle_name_en: string
  zone: 'zone_a' | 'zone_b' | 'out_of_range'
  delivery_fee_jod: number
  distance_km: number
}
