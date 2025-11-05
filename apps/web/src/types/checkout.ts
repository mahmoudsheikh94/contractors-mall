// Checkout flow types

export interface DeliveryAddress {
  latitude: number
  longitude: number
  address: string
  city?: string
  district?: string
  building_number?: string
  floor?: string
  apartment?: string
  phone: string
  notes?: string
}

export interface DeliverySchedule {
  date: string // ISO date string
  time_slot: 'morning' | 'afternoon' | 'evening' // 8-12, 12-4, 4-8
}

export interface CheckoutState {
  address: DeliveryAddress | null
  schedule: DeliverySchedule | null
  step: 'address' | 'schedule' | 'review' | 'payment'
}
