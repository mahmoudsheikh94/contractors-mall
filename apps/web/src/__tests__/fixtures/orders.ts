/**
 * Mock order, delivery, and vehicle estimation data for testing
 */

import { mockSuppliers } from './suppliers'
import { mockProducts } from './products'
import { mockUser } from './users'

// Mock vehicle estimation
export const mockVehicleEstimate = {
  vehicle_class_id: 'vc-001',
  vehicle_name_ar: 'وانيت 1 طن',
  vehicle_name_en: 'Pickup 1 Ton',
  zone: 'zone_a' as const,
  delivery_fee_jod: 15,
  capacity_headroom: {
    weight_utilization: 0.65,
    volume_utilization: 0.55,
    length_ok: true,
    open_bed_ok: true,
  },
  distance_km: 5.2,
}

export const mockVehicleEstimateLarge = {
  vehicle_class_id: 'vc-002',
  vehicle_name_ar: 'شاحنة 3.5 طن',
  vehicle_name_en: 'Truck 3.5 Ton',
  zone: 'zone_b' as const,
  delivery_fee_jod: 35,
  capacity_headroom: {
    weight_utilization: 0.82,
    volume_utilization: 0.75,
    length_ok: true,
    open_bed_ok: true,
  },
  distance_km: 15.8,
}

// Array of vehicle estimates for tests
export const mockVehicleEstimates = [mockVehicleEstimate, mockVehicleEstimateLarge]

// Mock delivery address
export const mockDeliveryAddress = {
  latitude: 31.9700,
  longitude: 35.9300,
  address: 'شارع الجامعة، عمان، الأردن',
  building_number: '15',
  floor: '3',
  apartment: 'شقة 5',
  phone: '0795551234',
  notes: 'يرجى الاتصال قبل الوصول',
}

// Mock delivery schedule
export const mockDeliverySchedule = {
  date: '2024-12-15',
  time_slot: 'morning' as const,
}

// Mock order
export const mockOrder = {
  order_id: 'order-001',
  order_number: 'ORD-20241201-12345',
  contractor_id: mockUser.id,
  supplier_id: mockSuppliers[0].supplier_id,
  status: 'pending_supplier_confirmation' as const,
  subtotal_jod: 145.0,
  delivery_fee_jod: 15.0,
  total_jod: 160.0,
  delivery_latitude: mockDeliveryAddress.latitude,
  delivery_longitude: mockDeliveryAddress.longitude,
  delivery_address: mockDeliveryAddress.address,
  delivery_date: mockDeliverySchedule.date,
  delivery_time_slot: mockDeliverySchedule.time_slot,
  delivery_zone: 'zone_a' as const,
  vehicle_class_id: mockVehicleEstimate.vehicle_class_id,
  created_at: '2024-12-01T10:00:00Z',
  updated_at: '2024-12-01T10:00:00Z',
}

// Mock order items
export const mockOrderItems = [
  {
    order_item_id: 'item-001',
    order_id: mockOrder.order_id,
    product_id: mockProducts[0].product_id,
    quantity: 10,
    unit_price_jod: 4.5,
    subtotal_jod: 45.0,
    created_at: '2024-12-01T10:00:00Z',
  },
  {
    order_item_id: 'item-002',
    order_id: mockOrder.order_id,
    product_id: mockProducts[1].product_id,
    quantity: 2,
    unit_price_jod: 550,
    subtotal_jod: 100.0,
    created_at: '2024-12-01T10:00:00Z',
  },
]

// Mock delivery
export const mockDelivery = {
  delivery_id: 'delivery-001',
  order_id: mockOrder.order_id,
  status: 'scheduled' as const,
  driver_id: null,
  scheduled_date: mockDeliverySchedule.date,
  scheduled_time_slot: mockDeliverySchedule.time_slot,
  delivery_pin: '1234',
  photo_url: null,
  delivered_at: null,
  created_at: '2024-12-01T10:00:00Z',
  updated_at: '2024-12-01T10:00:00Z',
}

// Mock payment
export const mockPayment = {
  payment_id: 'payment-001',
  order_id: mockOrder.order_id,
  amount_jod: mockOrder.total_jod,
  status: 'held' as const,
  payment_intent_id: 'pi_mock123456',
  created_at: '2024-12-01T10:00:00Z',
  updated_at: '2024-12-01T10:00:00Z',
}

// Mock complete order (with items, delivery, payment)
export const mockCompleteOrder = {
  ...mockOrder,
  items: mockOrderItems,
  delivery: mockDelivery,
  payment: mockPayment,
  supplier: mockSuppliers[0],
}

// Mock order requiring PIN (total >= 120 JOD)
export const mockOrderWithPIN = {
  ...mockOrder,
  order_id: 'order-002',
  order_number: 'ORD-20241201-67890',
  total_jod: 150.0,
  delivery: {
    ...mockDelivery,
    delivery_id: 'delivery-002',
    order_id: 'order-002',
    delivery_pin: '5678',
  },
}

// Mock order with photo only (total < 120 JOD)
export const mockOrderPhotoOnly = {
  ...mockOrder,
  order_id: 'order-003',
  order_number: 'ORD-20241201-11111',
  total_jod: 80.0,
  delivery: {
    ...mockDelivery,
    delivery_id: 'delivery-003',
    order_id: 'order-003',
    delivery_pin: null,
  },
}
