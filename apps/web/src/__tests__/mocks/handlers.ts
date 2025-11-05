/**
 * MSW (Mock Service Worker) handlers for API mocking
 */

import { http, HttpResponse } from 'msw'
import {
  mockSuppliers,
  mockProducts,
  mockVehicleEstimate,
  mockVehicleEstimateLarge,
  mockOrder,
  mockCompleteOrder,
} from '../fixtures'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const handlers = [
  // GET /api/suppliers - List all suppliers
  http.get(`${API_BASE}/api/suppliers`, () => {
    return HttpResponse.json({
      suppliers: mockSuppliers.filter((s) => s.is_active && s.is_verified),
    })
  }),

  // GET /api/suppliers/:id - Get single supplier
  http.get(`${API_BASE}/api/suppliers/:id`, ({ params }) => {
    const { id } = params
    const supplier = mockSuppliers.find((s) => s.supplier_id === id)

    if (!supplier) {
      return HttpResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return HttpResponse.json({ supplier })
  }),

  // GET /api/products - List products (with optional supplier filter)
  http.get(`${API_BASE}/api/products`, ({ request }) => {
    const url = new URL(request.url)
    const supplierId = url.searchParams.get('supplierId')

    let products = mockProducts.filter((p) => p.is_available)

    if (supplierId) {
      products = products.filter((p) => p.supplier_id === supplierId)
    }

    return HttpResponse.json({ products })
  }),

  // GET /api/products/:id - Get single product
  http.get(`${API_BASE}/api/products/:id`, ({ params }) => {
    const { id } = params
    const product = mockProducts.find((p) => p.product_id === id)

    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return HttpResponse.json({ product })
  }),

  // POST /api/vehicle-estimate - Get vehicle estimation
  http.post(`${API_BASE}/api/vehicle-estimate`, async ({ request }) => {
    const body = (await request.json()) as any

    const { supplier_latitude, supplier_longitude, contractor_latitude, contractor_longitude, items } =
      body

    if (!supplier_latitude || !supplier_longitude || !contractor_latitude || !contractor_longitude) {
      return HttpResponse.json({ error: 'Missing required coordinates' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return HttpResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    // Calculate total weight to decide vehicle type
    const totalWeight = items.reduce(
      (sum: number, item: any) => sum + item.weight_kg * item.quantity,
      0
    )

    // Mock distance calculation
    const distance = Math.sqrt(
      Math.pow((contractor_latitude - supplier_latitude) * 111, 2) +
        Math.pow((contractor_longitude - supplier_longitude) * 111, 2)
    )

    // Return appropriate vehicle based on weight and distance
    if (totalWeight > 1500 || distance > 12) {
      return HttpResponse.json({
        vehicleEstimate: {
          ...mockVehicleEstimateLarge,
          distance_km: distance,
        },
      })
    }

    return HttpResponse.json({
      vehicleEstimate: {
        ...mockVehicleEstimate,
        distance_km: distance,
      },
    })
  }),

  // POST /api/orders - Create order
  http.post(`${API_BASE}/api/orders`, async ({ request }) => {
    const body = (await request.json()) as any

    const { supplierId, items, deliveryAddress, deliverySchedule, vehicleEstimate } = body

    if (!supplierId || !items || !deliveryAddress || !deliverySchedule || !vehicleEstimate) {
      return HttpResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    )
    const total = subtotal + vehicleEstimate.delivery_fee_jod

    // Generate mock order number
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')
    const orderNumber = `ORD-${dateStr}-${random}`

    // Check if PIN is required (>= 120 JOD)
    const requiresPIN = total >= 120
    const deliveryPin = requiresPIN ? Math.floor(1000 + Math.random() * 9000).toString() : null

    const newOrder = {
      ...mockOrder,
      order_number: orderNumber,
      supplier_id: supplierId,
      subtotal_jod: subtotal,
      delivery_fee_jod: vehicleEstimate.delivery_fee_jod,
      total_jod: total,
      delivery_latitude: deliveryAddress.latitude,
      delivery_longitude: deliveryAddress.longitude,
      delivery_address: deliveryAddress.address,
      delivery_date: deliverySchedule.date,
      delivery_time_slot: deliverySchedule.time_slot,
      delivery_zone: vehicleEstimate.delivery_zone,
      vehicle_class_id: vehicleEstimate.vehicle_class_id,
      delivery_pin: deliveryPin,
    }

    return HttpResponse.json({
      order: newOrder,
      message: 'Order created successfully',
    })
  }),

  // GET /api/orders - List user's orders
  http.get(`${API_BASE}/api/orders`, () => {
    return HttpResponse.json({
      orders: [mockCompleteOrder],
    })
  }),

  // GET /api/orders/:id - Get single order
  http.get(`${API_BASE}/api/orders/:id`, ({ params }) => {
    const { id } = params

    if (id === mockCompleteOrder.order_id) {
      return HttpResponse.json({ order: mockCompleteOrder })
    }

    return HttpResponse.json({ error: 'Order not found' }, { status: 404 })
  }),

  // Error simulation handlers (for testing error states)
  http.get(`${API_BASE}/api/suppliers/error`, () => {
    return HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
  }),

  http.post(`${API_BASE}/api/orders/error`, () => {
    return HttpResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }),
]
