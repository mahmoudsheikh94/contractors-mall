import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mockPaymentProvider } from '@/lib/services/payment/mockPaymentProvider'
import { ApiErrors, handleApiError } from '@contractors-mall/shared'
import { z } from 'zod'
import type { CreateOrderResponse } from '@/types/order'
import { sendOrderConfirmationEmail } from '@/lib/email/resend'

/**
 * Zod validation schema for order creation
 */
const CreateOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID format'),
  items: z.array(
    z.object({
      productId: z.string().uuid('Invalid product ID format'),
      productName: z.string().optional(),
      productNameEn: z.string().optional(),
      unit: z.string().optional(),
      unitEn: z.string().optional(),
      quantity: z.number().int().positive('Quantity must be positive'),
      unitPrice: z.number().positive('Unit price must be positive'),
    })
  ).min(1, 'Order must contain at least one item'),
  deliveryAddress: z.object({
    address: z.string().min(10, 'Address must be at least 10 characters'),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  deliverySchedule: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    time_slot: z.string().min(1, 'Time slot is required'),
  }),
  vehicleEstimate: z.object({
    delivery_zone: z.enum(['zone_a', 'zone_b'], {
      errorMap: () => ({ message: 'Invalid delivery zone' })
    }),
    delivery_fee_jod: z.number().nonnegative('Delivery fee cannot be negative'),
  }),
})

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXXX
 */
function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')
  return `ORD-${dateStr}-${random}`
}

/**
 * Generate a 4-digit PIN for delivery confirmation
 */
function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/**
 * Get the photo/PIN threshold from settings
 */
async function getPhotoThreshold(supabase: any): Promise<number> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'payment_settings')
    .single()

  const threshold = data?.value?.photo_threshold_jod
  return threshold ? parseFloat(threshold) : 120 // Default 120 JOD
}

/**
 * Rollback helper - deletes order and all related records
 */
async function rollbackOrder(supabase: any, orderId: string): Promise<void> {
  try {
    // Delete in reverse order of creation to respect foreign keys
    await supabase.from('payments').delete().eq('order_id', orderId)
    await supabase.from('deliveries').delete().eq('order_id', orderId)
    await supabase.from('order_items').delete().eq('order_id', orderId)
    await supabase.from('orders').delete().eq('id', orderId)
  } catch (rollbackError) {
    console.error('Rollback failed:', rollbackError)
    // Log to monitoring service in production
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const error = ApiErrors.unauthorized()
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Check contractor profile and email verification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      const error = ApiErrors.notFound('Profile', user.id)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Only contractors need email verification to place orders
    if (profile.role === 'contractor' && !profile.email_verified) {
      const error = ApiErrors.businessRuleViolation(
        'Please verify your email address before placing an order',
        'يرجى تأكيد بريدك الإلكتروني قبل إتمام الطلب'
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Parse and validate request body
    const rawBody = await request.json()
    const validationResult = CreateOrderSchema.safeParse(rawBody)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      const error = ApiErrors.validationError(
        firstError.path.join('.'),
        firstError.message
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const body = validationResult.data
    const { supplierId, deliveryAddress, deliverySchedule, vehicleEstimate } = body

    // Calculate totals
    const subtotal = body.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const deliveryFee = vehicleEstimate.delivery_fee_jod
    const total = subtotal + deliveryFee

    // Get threshold for photo vs PIN
    const photoThreshold = await getPhotoThreshold(supabase)
    const requiresPIN = total >= photoThreshold

    // Generate order number
    const orderNumber = generateOrderNumber()

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        contractor_id: user.id,
        supplier_id: supplierId,
        status: 'pending',
        subtotal_jod: subtotal,
        delivery_fee_jod: deliveryFee,
        total_jod: total,
        vehicle_class_id: null,
        vehicle_type: null,
        delivery_zone: vehicleEstimate.delivery_zone,
        delivery_address: deliveryAddress.address,
        delivery_neighborhood: 'Amman',  // TODO: Get from address breakdown
        delivery_city: 'Amman',          // TODO: Get from address breakdown
        delivery_phone: deliveryAddress.phone,
        delivery_latitude: deliveryAddress.latitude,
        delivery_longitude: deliveryAddress.longitude,
        scheduled_delivery_date: deliverySchedule.date,
        scheduled_delivery_time: deliverySchedule.time_slot,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      const error = ApiErrors.databaseError('create order', orderError)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // 2. Create order items
    const orderItems = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName || item.productNameEn || 'Unknown Product',
      unit: item.unit || item.unitEn || 'unit',
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      await rollbackOrder(supabase, order.id)
      const error = ApiErrors.databaseError('create order items', itemsError)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // 3. Create delivery record
    const deliveryData: any = {
      order_id: order.id,
      scheduled_date: deliverySchedule.date,
      scheduled_time_slot: deliverySchedule.time_slot,
      address_line: deliveryAddress.address,
      phone: deliveryAddress.phone,
      recipient_phone: deliveryAddress.phone,
    }

    // Generate PIN if order amount >= threshold
    if (requiresPIN) {
      deliveryData.confirmation_pin = generatePIN()
      deliveryData.pin_verified = false
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert(deliveryData)
      .select()
      .single()

    if (deliveryError || !delivery) {
      console.error('Delivery creation error:', deliveryError)
      await rollbackOrder(supabase, order.id)
      const error = ApiErrors.databaseError('create delivery record', deliveryError)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // 4. Create payment intent via payment provider
    let paymentIntent
    try {
      paymentIntent = await mockPaymentProvider.createPaymentIntent({
        amount: total * 100, // Convert to fils
        currency: 'JOD',
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          contractor_id: user.id,
          supplier_id: supplierId,
        },
      })

      // 5. Hold (capture) the payment immediately
      await mockPaymentProvider.holdPayment(paymentIntent.id)
    } catch (paymentProviderError) {
      console.error('Payment provider error:', paymentProviderError)
      await rollbackOrder(supabase, order.id)
      const error = ApiErrors.paymentProviderError()
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // 6. Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        payment_intent_id: paymentIntent.id,
        payment_method: 'mock_card',
        status: 'held', // Money is now in escrow
        amount_jod: total,
        held_at: new Date().toISOString(),
        metadata: {
          requires_pin: requiresPIN,
          photo_threshold: photoThreshold,
        },
      })
      .select()
      .single()

    if (paymentError || !payment) {
      console.error('Payment creation error:', paymentError)
      await rollbackOrder(supabase, order.id)
      const error = ApiErrors.databaseError('create payment record', paymentError)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // 7. Update order status to 'confirmed' since payment is held
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order.id)

    // 8. Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(
      user.email || '',
      orderNumber,
      total,
      {
        items: body.items.map(item => ({
          name: item.productName || item.productNameEn || 'Unknown Product',
          quantity: item.quantity,
          price: item.unitPrice
        })),
        deliveryFee: deliveryFee,
        vehicle: vehicleEstimate.delivery_zone === 'zone_a' ? 'Zone A' : 'Zone B'
      }
    ).catch(err => {
      console.error('Failed to send order confirmation email:', err)
      // Don't fail the order if email fails
    })

    // Return the created order and payment info
    const response: CreateOrderResponse = {
      order: {
        ...order,
        status: 'confirmed',
        created_at: order.created_at || new Date().toISOString(), // Ensure non-null
      } as any, // Type assertion due to Supabase type mismatch
      payment: {
        id: payment.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret || '',
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Order creation API error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
  }
}
