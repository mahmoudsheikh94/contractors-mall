import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { deliveryId, pin } = await request.json()

    if (!deliveryId || !pin) {
      return NextResponse.json(
        { error: 'المعلومات المطلوبة ناقصة' },
        { status: 400 }
      )
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'رمز PIN يجب أن يكون 4 أرقام' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get delivery details
    const { data: delivery, error: fetchError } = (await supabase
      .from('deliveries')
      .select('*, order:orders!inner(*)')
      .eq('id', deliveryId)
      .single()) as any

    if (fetchError || !delivery) {
      console.error('Error fetching delivery:', fetchError)
      return NextResponse.json(
        { error: 'التوصيل غير موجود' },
        { status: 404 }
      )
    }

    // Check if already completed
    if (delivery.completed_at) {
      return NextResponse.json(
        { error: 'تم تأكيد هذا التوصيل مسبقاً' },
        { status: 400 }
      )
    }

    // Check max attempts
    if (delivery.pin_attempts >= 3) {
      return NextResponse.json(
        { error: 'تجاوزت الحد الأقصى لمحاولات PIN' },
        { status: 400 }
      )
    }

    // Verify PIN
    if (pin !== delivery.delivery_pin) {
      // Increment attempts
      const newAttempts = delivery.pin_attempts + 1
      await supabase
        .from('deliveries')
        .update({ pin_attempts: newAttempts, updated_at: new Date().toISOString() })
        .eq('id', deliveryId)

      return NextResponse.json(
        {
          error: 'رمز PIN غير صحيح',
          remainingAttempts: 3 - newAttempts,
        },
        { status: 400 }
      )
    }

    // PIN is correct - Complete delivery
    const now = new Date().toISOString()

    // Update delivery
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        pin_verified_at: now,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', deliveryId)

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json(
        { error: 'فشل تحديث التوصيل' },
        { status: 500 }
      )
    }

    // Update order status to awaiting contractor confirmation
    // NOTE: Payment will NOT be released until contractor also confirms
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'awaiting_contractor_confirmation',
        updated_at: now,
      })
      .eq('id', delivery.order_id)

    if (orderError) {
      console.error('Error updating order:', orderError)
      // Don't fail the request - delivery is already confirmed by supplier
    }

    // Mark supplier as confirmed (dual confirmation system)
    const { error: confirmError } = await supabase
      .from('deliveries')
      .update({
        supplier_confirmed: true,
        supplier_confirmed_at: now,
      })
      .eq('id', deliveryId)

    if (confirmError) {
      console.error('Error marking supplier confirmation:', confirmError)
      // Don't fail - the PIN verification already succeeded
    }

    // TODO: Send notification to contractor to confirm delivery
    // await NotificationService.notifySupplierConfirmedDelivery(delivery.order_id)

    // NOTE: Payment release will happen when contractor confirms delivery
    // Payment is NOT released here - we need dual confirmation

    return NextResponse.json({
      success: true,
      message: 'تم تأكيد التوصيل من جانبك بنجاح. في انتظار تأكيد العميل لاستلام الطلب.',
      data: {
        order_id: delivery.order_id,
        status: 'awaiting_contractor_confirmation',
        supplier_confirmed: true,
        contractor_confirmed: false,
      },
    })
  } catch (error) {
    console.error('Error in verify-pin:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
