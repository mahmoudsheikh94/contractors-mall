import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mockPaymentProvider } from '@/lib/services/payment/mockPaymentProvider'
import type { CreateOrderRequest, CreateOrderResponse } from '@/types/order'

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if contractor's email is verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only contractors need email verification to place orders
    if (profile.role === 'contractor' && !profile.email_verified) {
      return NextResponse.json(
        {
          error: 'يرجى تأكيد بريدك الإلكتروني قبل إتمام الطلب',
          error_en: 'Please verify your email address before placing an order',
          error_code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body: CreateOrderRequest = await request.json()
    const { supplierId, deliveryAddress, deliverySchedule, vehicleEstimate } = body

    // Validate required fields (vehicleEstimate is now optional, but we still need delivery zone and fee)
    if (
      !supplierId ||
      !body.items ||
      body.items.length === 0 ||
      !deliveryAddress ||
      !deliverySchedule ||
      !vehicleEstimate ||
      !vehicleEstimate.delivery_zone ||
      !vehicleEstimate.delivery_fee_jod
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = body.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const deliveryFee = vehicleEstimate.delivery_fee_jod
    const total = subtotal + deliveryFee

    // Get threshold for photo vs PIN
    const photoThreshold = await getPhotoThreshold(supabase)
    const requiresPIN = total >= photoThreshold

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Start a transaction (using Supabase RPC or multiple queries)
    // Note: Supabase doesn't support transactions in the same way as raw SQL,
    // but we can handle errors and rollback manually if needed

    // 1. Create the order (vehicle_class_id and vehicle_type are now null - suppliers handle logistics)
    const { data: order, error: orderError } = await (supabase
      .from('orders')
      .insert as any)({
        order_number: orderNumber,
        contractor_id: user.id,
        supplier_id: supplierId,
        status: 'pending',
        subtotal_jod: subtotal,
        delivery_fee_jod: deliveryFee,
        total_jod: total,
        vehicle_class_id: null, // No longer using vehicle estimation
        vehicle_type: null, // Suppliers handle their own logistics (vehicle selection)
        delivery_zone: vehicleEstimate.delivery_zone,
        delivery_address: deliveryAddress.address,
        delivery_neighborhood: 'Amman',  // TODO: Get from address breakdown
        delivery_city: 'Amman',          // TODO: Get from address breakdown
        delivery_phone: deliveryAddress.phone,
        delivery_latitude: deliveryAddress.latitude,
        delivery_longitude: deliveryAddress.longitude,
        scheduled_delivery_date: deliverySchedule.date,     // Correct column name
        scheduled_delivery_time: deliverySchedule.time_slot, // Correct column name
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError?.message },
        { status: 500 }
      )
    }

    // 2. Create order items (with product details for order history)
    const orderItems = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName || item.productNameEn || 'Unknown Product', // Use Arabic name, fallback to English
      unit: item.unit || item.unitEn || 'unit', // Use Arabic unit, fallback to English
      quantity: item.quantity,
      unit_price_jod: item.unitPrice, // Correct column name
      total_jod: item.unitPrice * item.quantity, // Correct column name
    }))

    const { error: itemsError } = await (supabase.from('order_items').insert as any)(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create order items', details: itemsError.message },
        { status: 500 }
      )
    }

    // 3. Create delivery record with all required fields
    const deliveryData: any = {
      order_id: order.id,
      scheduled_date: deliverySchedule.date, // Scheduled delivery date
      scheduled_time_slot: deliverySchedule.time_slot, // Scheduled time slot
      address_line: deliveryAddress.address, // Full address string
      phone: deliveryAddress.phone, // Recipient phone
      recipient_phone: deliveryAddress.phone, // Also set recipient_phone for backward compatibility
    }

    // Generate PIN if order amount >= threshold
    if (requiresPIN) {
      deliveryData.confirmation_pin = generatePIN()
      deliveryData.pin_verified = false
    }

    const { data: delivery, error: deliveryError } = await (supabase
      .from('deliveries')
      .insert as any)(deliveryData)
      .select()
      .single()

    if (deliveryError || !delivery) {
      console.error('Delivery creation error:', deliveryError)
      // Rollback
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create delivery record', details: deliveryError?.message },
        { status: 500 }
      )
    }

    // 4. Create payment intent via payment provider
    const paymentIntent = await mockPaymentProvider.createPaymentIntent({
      amount: total * 100, // Convert to fils (smallest unit)
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

    // 6. Create payment record in database
    const { data: payment, error: paymentError } = await (supabase
      .from('payments')
      .insert as any)({
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
      // Rollback
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create payment record', details: paymentError?.message },
        { status: 500 }
      )
    }

    // 7. Update order status to 'confirmed' since payment is held
    await (supabase
      .from('orders')
      .update as any)({ status: 'confirmed' })
      .eq('order_id', order.order_id)

    // Return the created order and payment info
    const response: CreateOrderResponse = {
      order: {
        ...order,
        status: 'confirmed',
      },
      payment: {
        id: payment.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret || '',
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Order creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
