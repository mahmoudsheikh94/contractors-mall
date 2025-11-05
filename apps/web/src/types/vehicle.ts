// Vehicle estimation types

export interface VehicleEstimateItem {
  weight_kg: number
  volume_m3: number
  length_m: number
  requires_open_bed: boolean
}

export interface VehicleEstimateRequest {
  supplierId: string
  deliveryLat: number
  deliveryLng: number
  items: VehicleEstimateItem[]
}

export interface VehicleEstimate {
  vehicle_class_id: string
  vehicle_name_ar: string
  vehicle_name_en: string
  zone: 'zone_a' | 'zone_b'
  delivery_fee_jod: number
  capacity_headroom: {
    weight_utilization: number // percentage
    volume_utilization: number // percentage
    length_ok: boolean
    open_bed_ok: boolean
  }
  distance_km: number
}

export interface VehicleEstimateResponse {
  estimate: VehicleEstimate
}

export interface VehicleEstimateError {
  error: string
  details?: string
}
