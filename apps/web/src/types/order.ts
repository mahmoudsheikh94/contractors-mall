// Order types

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface Order {
  id: string
  order_number: string
  contractor_id: string
  supplier_id: string
  project_id: string | null
  status: OrderStatus
  subtotal_jod: number
  delivery_fee_jod: number
  total_jod: number
  vehicle_class_id: string | null
  delivery_zone: 'zone_a' | 'zone_b' | null
  delivery_address: string
  delivery_latitude: number
  delivery_longitude: number
  scheduled_delivery_date: string
  scheduled_delivery_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  weight_kg: number | null
  volume_m3: number | null
  created_at: string
}

export interface Delivery {
  id: string
  order_id: string
  driver_id: string | null
  driver_name: string | null
  driver_phone: string | null
  vehicle_plate_number: string | null
  started_at: string | null
  completed_at: string | null
  proof_photo_url: string | null
  confirmation_pin: string | null
  pin_verified: boolean
  recipient_name: string | null
  recipient_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateOrderRequest {
  supplierId: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
  }>
  deliveryAddress: {
    latitude: number
    longitude: number
    address: string
    phone: string
  }
  deliverySchedule: {
    date: string
    time_slot: string
  }
  vehicleEstimate: {
    vehicle_class_id?: string // Optional - no longer using vehicle estimation
    delivery_fee_jod: number
    delivery_zone: 'zone_a' | 'zone_b'
  }
}

export interface CreateOrderResponse {
  order: Order
  payment: {
    id: string
    payment_intent_id: string
    client_secret: string
  }
}
