/**
 * Photo Confirmation API Route
 * ===========================
 * Handles photo upload for delivery confirmation (orders <120 JOD)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService } from '@/lib/services/payment/service'
import { notificationService } from '@/lib/services/notifications/service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const orderId = formData.get('orderId') as string
    const photo = formData.get('photo') as File
    const deliveryId = formData.get('deliveryId') as string | null

    if (!orderId || !photo) {
      return NextResponse.json(
        { error: 'معلومات مفقودة' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'الملف المرفوع ليس صورة' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        delivery:deliveries(*),
        contractor:profiles!contractor_id(full_name, email, phone),
        supplier:suppliers!supplier_id(id, business_name, owner_id)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if order requires photo (< 120 JOD)
    if (order.total_amount >= 120) {
      return NextResponse.json(
        { error: 'هذا الطلب يتطلب رمز تأكيد وليس صورة' },
        { status: 400 }
      )
    }

    // Check if order is already completed
    if (order.status === 'completed') {
      return NextResponse.json(
        { error: 'تم تأكيد استلام هذا الطلب مسبقاً' },
        { status: 400 }
      )
    }

    // Get or create delivery record
    let delivery = order.delivery?.[0]

    if (!delivery && deliveryId) {
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .eq('order_id', orderId)
        .single()

      delivery = deliveryData
    }

    if (!delivery) {
      // Create a new delivery record if none exists
      const { data: newDelivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          order_id: orderId,
          status: 'in_transit',
          driver_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (deliveryError) {
        throw deliveryError
      }

      delivery = newDelivery
    }

    // Upload photo to Supabase Storage
    const fileName = `delivery-proofs/${orderId}/${Date.now()}-${photo.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(fileName, photo, {
        contentType: photo.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Photo upload error:', uploadError)
      return NextResponse.json(
        { error: 'فشل رفع الصورة' },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded photo
    const { data: { publicUrl } } = supabase.storage
      .from('delivery-proofs')
      .getPublicUrl(fileName)

    const now = new Date().toISOString()

    // Update delivery with photo proof
    const { error: deliveryUpdateError } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        delivered_at: now,
        confirmed_by: user.id,
        confirmation_method: 'photo',
        proof_photo_url: publicUrl,
        updated_at: now
      })
      .eq('id', delivery.id)

    if (deliveryUpdateError) {
      throw deliveryUpdateError
    }

    // Update order status
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now
      })
      .eq('id', orderId)

    if (orderUpdateError) {
      throw orderUpdateError
    }

    // Get payment transaction
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'captured')
      .single()

    if (transaction) {
      // Release payment from escrow
      try {
        await paymentService.confirmDelivery({
          orderId: orderId,
          transactionId: transaction.id,
          supplierId: order.supplier.id
        })
      } catch (paymentError) {
        console.error('Failed to release payment:', paymentError)
        // Don't fail the whole operation if payment release fails
        // It can be handled manually
      }
    }

    // Send notifications
    try {
      // Notify contractor
      if (order.contractor?.email) {
        await notificationService.send({
          id: `delivery-confirmed-photo-${orderId}`,
          type: 'DELIVERY_CONFIRMED' as any,
          channel: 'email' as any,
          priority: 'high' as any,
          recipient: {
            id: order.contractor_id,
            email: order.contractor.email,
            name: order.contractor.full_name
          },
          subject: `تم تأكيد استلام الطلب #${order.order_number}`,
          html: `
            <div dir="rtl">
              <h2>تم تأكيد استلام طلبك بنجاح</h2>
              <p>رقم الطلب: #${order.order_number}</p>
              <p>تم تأكيد الاستلام بصورة التوصيل</p>
              <p><a href="${publicUrl}" target="_blank">عرض صورة التوصيل</a></p>
            </div>
          `,
          data: {
            orderId,
            orderNumber: order.order_number,
            photoUrl: publicUrl
          }
        } as any)
      }

      // Notify supplier
      const { data: supplierOwner } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', order.supplier.owner_id)
        .single()

      if (supplierOwner?.email) {
        await notificationService.send({
          id: `delivery-confirmed-photo-supplier-${orderId}`,
          type: 'DELIVERY_CONFIRMED' as any,
          channel: 'email' as any,
          priority: 'high' as any,
          recipient: {
            id: order.supplier.owner_id,
            email: supplierOwner.email,
            name: supplierOwner.full_name
          },
          subject: `تم تأكيد توصيل الطلب #${order.order_number}`,
          html: `
            <div dir="rtl">
              <h2>تم تأكيد توصيل الطلب</h2>
              <p>رقم الطلب: #${order.order_number}</p>
              <p>تم التأكيد بصورة التوصيل</p>
              <p>سيتم الإفراج عن المبلغ قريباً</p>
            </div>
          `,
          data: {
            orderId,
            orderNumber: order.order_number
          }
        } as any)
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError)
    }

    return NextResponse.json({
      success: true,
      message: 'تم تأكيد استلام الطلب بنجاح',
      order: {
        id: orderId,
        orderNumber: order.order_number,
        status: 'completed'
      },
      photoUrl: publicUrl
    })

  } catch (error: any) {
    console.error('Photo confirmation error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء رفع صورة التأكيد' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve delivery photos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { error: 'معرف الطلب مطلوب' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get delivery with photo
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('order_id', orderId)
      .eq('confirmation_method', 'photo')
      .single()

    if (error || !delivery) {
      return NextResponse.json(
        { error: 'لا توجد صورة توصيل لهذا الطلب' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      delivery: {
        id: delivery.id,
        photoUrl: delivery.proof_photo_url,
        deliveredAt: delivery.delivered_at,
        confirmedBy: delivery.confirmed_by
      }
    })

  } catch (error: any) {
    console.error('Get delivery photo error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب صورة التوصيل' },
      { status: 500 }
    )
  }
}