import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { deliveryId, photoUrl } = await request.json()

    if (!deliveryId || !photoUrl) {
      return NextResponse.json(
        { error: 'المعلومات المطلوبة ناقصة' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get delivery details
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('*, order:orders!inner(*)')
      .eq('delivery_id', deliveryId)
      .single()

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

    // Complete delivery
    const now = new Date().toISOString()

    // Update delivery with photo
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        photo_url: photoUrl,
        photo_uploaded_at: now,
        completed_at: now,
        updated_at: now,
      })
      .eq('delivery_id', deliveryId)

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      return NextResponse.json(
        { error: 'فشل تحديث التوصيل' },
        { status: 500 }
      )
    }

    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: now,
      })
      .eq('order_id', delivery.order_id)

    if (orderError) {
      console.error('Error updating order:', orderError)
      // Don't fail the request - delivery is already confirmed
    }

    // Release payment from escrow
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'released',
        released_at: now,
        updated_at: now,
      })
      .eq('order_id', delivery.order_id)
      .eq('status', 'escrow_held')

    if (paymentError) {
      console.error('Error releasing payment:', paymentError)
      // Don't fail the request - delivery is already confirmed
      // Payment can be released manually if needed
    }

    return NextResponse.json({
      success: true,
      message: 'تم تأكيد التوصيل بنجاح',
    })
  } catch (error) {
    console.error('Error in confirm-photo:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}
