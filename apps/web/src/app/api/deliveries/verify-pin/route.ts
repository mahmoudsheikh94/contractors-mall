/**
 * PIN Verification API Route
 * =========================
 * Verifies delivery PIN for high-value orders (≥120 JOD)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService } from '@/lib/services/payment/service'
import { notificationService } from '@/lib/services/notifications/service'

export async function POST(request: NextRequest) {
  try {
    const { orderId, pin } = await request.json()

    if (!orderId || !pin) {
      return NextResponse.json(
        { error: 'معلومات مفقودة' },
        { status: 400 }
      )
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'رمز التأكيد غير صالح' },
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

    // Get order details with delivery info
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

    // Check if order requires PIN (≥120 JOD)
    if (Number(order.total_jod) < 120) {
      return NextResponse.json(
        { error: 'هذا الطلب لا يتطلب رمز تأكيد' },
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

    // Get the delivery record
    const delivery = (order.delivery as any)?.[0]
    if (!delivery) {
      return NextResponse.json(
        { error: 'لا توجد معلومات توصيل لهذا الطلب' },
        { status: 404 }
      )
    }

    // Verify PIN
    if (delivery.confirmation_pin !== pin) {
      // Log failed attempt
      await (supabase as any)
        .from('delivery_attempts')
        .insert({
          delivery_id: delivery.id,
          attempt_type: 'pin_verification',
          success: false,
          metadata: {
            entered_pin: pin,
            user_id: user.id
          }
        })

      return NextResponse.json(
        { error: 'رمز التأكيد غير صحيح' },
        { status: 400 }
      )
    }

    // PIN is correct - complete the delivery
    const now = new Date().toISOString()

    // Update delivery status
    const { error: deliveryUpdateError } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        delivered_at: now,
        confirmed_by: user.id,
        confirmation_method: 'pin',
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
    const { data: transaction } = await (supabase as any)
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
          supplierId: (order.supplier as any).id
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
          id: `delivery-confirmed-${orderId}`,
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
              <p>تم تأكيد الاستلام باستخدام رمز التأكيد</p>
            </div>
          `,
          data: {
            orderId,
            orderNumber: order.order_number
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
          id: `delivery-confirmed-supplier-${orderId}`,
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
      }
    })

  } catch (error: any) {
    console.error('PIN verification error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من رمز التأكيد' },
      { status: 500 }
    )
  }
}