/**
 * API Route: Upload Delivery Proof Photo
 *
 * POST /api/orders/[orderId]/upload-proof
 *
 * Uploads photo proof of delivery for orders < 120 JOD.
 * On successful upload:
 * - Stores photo in Supabase Storage
 * - Updates delivery record with photo URL
 * - Triggers payment release from escrow
 * - Updates order status to 'completed'
 *
 * Security:
 * - Only for orders with total_jod < 120
 * - File size limit: 5MB
 * - Allowed formats: image/jpeg, image/png, image/webp
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const formData = await request.formData()
    const photo = formData.get('photo') as File

    // Validate file presence
    if (!photo) {
      return NextResponse.json(
        { error: 'الرجاء إرفاق صورة' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. الرجاء رفع صورة بصيغة JPG أو PNG' },
        { status: 400 }
      )
    }

    // Validate file size
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف يتجاوز 5 ميجابايت' },
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
          photo_url,
          photo_uploaded_at
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

    // Verify order requires photo proof (< 120 JOD)
    if (order.total_jod >= 120) {
      return NextResponse.json(
        { error: 'هذا الطلب يتطلب رمز PIN وليس صورة' },
        { status: 400 }
      )
    }

    // Check if photo already uploaded
    if (delivery.photo_uploaded_at) {
      return NextResponse.json(
        { error: 'تم رفع صورة التوصيل مسبقاً' },
        { status: 400 }
      )
    }

    // Upload photo to Supabase Storage
    const fileExt = photo.name.split('.').pop()
    const fileName = `${orderId}_${Date.now()}.${fileExt}`
    const filePath = `delivery-proofs/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('deliveries')
      .upload(filePath, photo, {
        contentType: photo.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return NextResponse.json(
        { error: 'فشل رفع الصورة. الرجاء المحاولة مرة أخرى' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('deliveries')
      .getPublicUrl(filePath)

    const photoUrl = urlData.publicUrl

    // Update delivery record
    const { error: deliveryUpdateError } = await (supabase
      .from('deliveries')
      .update as any)({
        photo_url: photoUrl,
        photo_uploaded_at: new Date().toISOString(),
      })
      .eq('delivery_id', delivery.delivery_id)

    if (deliveryUpdateError) {
      console.error('Error updating delivery:', deliveryUpdateError)

      // Cleanup uploaded file
      await supabase.storage.from('deliveries').remove([filePath])

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
      message: 'تم رفع صورة التوصيل بنجاح. تم تحرير المبلغ للمورد.',
      order: {
        order_id: orderId,
        status: 'completed',
        payment_status: 'released',
        photo_url: photoUrl,
      },
    })
  } catch (error) {
    console.error('Error uploading delivery proof:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء رفع الصورة' },
      { status: 500 }
    )
  }
}
