/**
 * API Route: Verify Delivery PIN
 *
 * POST /api/orders/[orderId]/verify-pin
 *
 * Verifies the delivery PIN entered by the supplier/driver.
 * On successful verification:
 * - Updates delivery status
 * - Triggers payment release from escrow
 * - Updates order status to 'delivered'
 *
 * Security:
 * - Rate limiting: Max 3 attempts per delivery
 * - PIN is 4 digits
 * - Only for orders with total_jod >= 120
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VerifyPINRequest {
  pin: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body: VerifyPINRequest = await request.json()

    // Validate input
    if (!body.pin || body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
      return NextResponse.json(
        { error: 'رمز PIN غير صالح. يجب أن يكون 4 أرقام' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get order with delivery and payment info
    const { data: order, error: orderError } = (await supabase
      .from('orders')
      .select(`
        order_id,
        status,
        total_jod,
        deliveries!inner (
          delivery_id,
          delivery_pin,
          pin_attempts,
          pin_verified_at
        ),
        payments!inner (
          payment_id,
          status
        )
      `)
      .eq('order_id', orderId)
      .single()) as { data: any, error: any }

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    const delivery = (order.deliveries as any)
    const payment = (order.payments as any)

    // Verify order requires PIN (>= 120 JOD)
    if (order.total_jod < 120) {
      return NextResponse.json(
        { error: 'هذا الطلب لا يتطلب رمز PIN. يتم التأكيد بالصورة فقط' },
        { status: 400 }
      )
    }

    // Check if already verified
    if (delivery.pin_verified_at) {
      return NextResponse.json(
        { error: 'تم التحقق من رمز PIN مسبقاً' },
        { status: 400 }
      )
    }

    // Check PIN attempts (max 3)
    if (delivery.pin_attempts >= 3) {
      return NextResponse.json(
        {
          error: 'تم تجاوز الحد الأقصى لمحاولات إدخال رمز PIN. يرجى التواصل مع الدعم الفني',
        },
        { status: 429 }
      )
    }

    // Verify PIN
    if (body.pin !== delivery.delivery_pin) {
      // Increment attempts
      const { error: updateError } = await (supabase
        .from('deliveries')
        .update as any)({ pin_attempts: delivery.pin_attempts + 1 })
        .eq('delivery_id', delivery.delivery_id)

      if (updateError) {
        console.error('Error updating PIN attempts:', updateError)
      }

      const remainingAttempts = 3 - (delivery.pin_attempts + 1)

      return NextResponse.json(
        {
          error: `رمز PIN غير صحيح. المحاولات المتبقية: ${remainingAttempts}`,
          remainingAttempts,
        },
        { status: 401 }
      )
    }

    // PIN is correct - Update delivery status
    const { error: deliveryUpdateError } = await (supabase
      .from('deliveries')
      .update as any)({
        pin_verified_at: new Date().toISOString(),
        pin_attempts: delivery.pin_attempts + 1, // Record the successful attempt
      })
      .eq('delivery_id', delivery.delivery_id)

    if (deliveryUpdateError) {
      console.error('Error updating delivery:', deliveryUpdateError)
      return NextResponse.json(
        { error: 'فشل تحديث حالة التوصيل' },
        { status: 500 }
      )
    }

    // Update order status to 'delivered'
    const { error: orderUpdateError } = await (supabase
      .from('orders')
      .update as any)({ status: 'delivered' })
      .eq('order_id', orderId)

    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError)
      return NextResponse.json(
        { error: 'فشل تحديث حالة الطلب' },
        { status: 500 }
      )
    }

    // Release payment from escrow
    const { error: paymentUpdateError } = await (supabase
      .from('payments')
      .update as any)({ status: 'released' })
      .eq('payment_id', payment.payment_id)

    if (paymentUpdateError) {
      console.error('Error releasing payment:', paymentUpdateError)
      return NextResponse.json(
        { error: 'فشل تحرير المبلغ' },
        { status: 500 }
      )
    }

    // Update order status to 'completed'
    const { error: completeOrderError } = await (supabase
      .from('orders')
      .update as any)({ status: 'completed' })
      .eq('order_id', orderId)

    if (completeOrderError) {
      console.error('Error completing order:', completeOrderError)
    }

    return NextResponse.json({
      success: true,
      message: 'تم التحقق من رمز PIN بنجاح. تم تحرير المبلغ للمورد.',
      order: {
        order_id: orderId,
        status: 'completed',
        payment_status: 'released',
      },
    })
  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من رمز PIN' },
      { status: 500 }
    )
  }
}
