import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'accepted'
  | 'in_delivery'
  | 'awaiting_contractor_confirmation'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'disputed'

interface DeliveryConfirmation {
  delivery_id: string
  supplier_confirmed: boolean
  contractor_confirmed: boolean
}

/**
 * POST /api/orders/[orderId]/confirm-delivery
 *
 * Contractor confirms receipt of delivery (dual confirmation system).
 * This is the second confirmation - supplier must have confirmed first.
 *
 * Body:
 * {
 *   confirmed: boolean,  // true = confirm delivery, false = report issue
 *   issues?: string      // required if confirmed === false
 * }
 *
 * Flow:
 * - If confirmed === true:
 *   1. Mark contractor_confirmed = true
 *   2. Set order status = 'delivered'
 *   3. Check for disputes
 *   4. If no disputes, release payment and set status = 'completed'
 *
 * - If confirmed === false:
 *   1. Create dispute
 *   2. Set order status = 'disputed'
 *   3. Freeze payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.orderId

    // Parse request body
    const body = await request.json()
    const { confirmed, issues } = body

    // Validate input
    if (typeof confirmed !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: confirmed must be a boolean' },
        { status: 400 }
      )
    }

    if (confirmed === false && !issues?.trim()) {
      return NextResponse.json(
        { error: 'يرجى تحديد المشكلة قبل الإبلاغ' },
        { status: 400 }
      )
    }

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the order and verify contractor ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, contractor_id, supplier_id, status, total_jod')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Type assertion for order status
    const orderStatus = order.status as OrderStatus

    // Verify contractor ownership
    if (order.contractor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this order' },
        { status: 403 }
      )
    }

    // Validate order status
    if (orderStatus !== 'awaiting_contractor_confirmation') {
      return NextResponse.json(
        {
          error: 'Invalid order status',
          message: `Order must be awaiting your confirmation. Current status: ${orderStatus}`,
        },
        { status: 400 }
      )
    }

    // Get delivery record and verify supplier confirmed first
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('deliveries')
      .select('delivery_id, supplier_confirmed, contractor_confirmed')
      .eq('order_id', orderId)
      .single()

    if (deliveryError || !deliveryData) {
      return NextResponse.json(
        { error: 'Delivery record not found' },
        { status: 404 }
      )
    }

    // Type assertion for delivery with new confirmation columns
    const delivery = deliveryData as unknown as DeliveryConfirmation

    if (!delivery.supplier_confirmed) {
      return NextResponse.json(
        {
          error: 'Supplier must confirm delivery first',
          message: 'المورد لم يؤكد التوصيل بعد. يرجى الانتظار.',
        },
        { status: 400 }
      )
    }

    if (delivery.contractor_confirmed) {
      return NextResponse.json(
        {
          error: 'Already confirmed',
          message: 'لقد قمت بتأكيد استلام هذا الطلب بالفعل.',
        },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // ==========================================
    // CONFIRMED DELIVERY PATH
    // ==========================================
    if (confirmed === true) {
      // 1. Mark contractor as confirmed
      const { error: confirmError } = await supabase
        .from('deliveries')
        .update({
          contractor_confirmed: true,
          contractor_confirmed_at: now,
          completed_at: now,
          updated_at: now,
        })
        .eq('delivery_id', delivery.delivery_id)

      if (confirmError) {
        console.error('Error marking contractor confirmation:', confirmError)
        return NextResponse.json(
          { error: 'Failed to confirm delivery' },
          { status: 500 }
        )
      }

      // 2. Update order status to delivered
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          updated_at: now,
        })
        .eq('id', orderId)

      if (orderUpdateError) {
        console.error('Error updating order status:', orderUpdateError)
        // Continue - confirmation succeeded
      }

      // 3. Check if there are any active disputes
      const { data: dispute } = await supabase
        .from('disputes')
        .select('id, status')
        .eq('order_id', orderId)
        .in('status', ['pending', 'investigating', 'site_visit_scheduled'])
        .maybeSingle()

      let paymentReleased = false

      // 4. If no active disputes, release payment automatically
      if (!dispute) {
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'released',
            released_at: now,
            updated_at: now,
          })
          .eq('order_id', orderId)
          .eq('status', 'escrow_held')

        if (paymentError) {
          console.error('Error releasing payment:', paymentError)
          // Don't fail the request - payment can be released manually
        } else {
          paymentReleased = true

          // 5. Update order status to completed
          await supabase
            .from('orders')
            .update({ status: 'completed', updated_at: now })
            .eq('id', orderId)
        }
      }

      // 6. Create order activity
      await supabase
        .from('order_activities')
        .insert({
          order_id: orderId,
          activity_type: 'delivery_confirmed_contractor',
          description: 'Contractor confirmed delivery receipt',
          metadata: {
            confirmed_at: now,
            payment_released: paymentReleased,
          },
          created_by: user.id,
        })

      // TODO: Send notifications
      // await NotificationService.notifyContractorConfirmedDelivery(orderId)
      // if (paymentReleased) {
      //   await NotificationService.notifyPaymentReleased(orderId)
      // }

      return NextResponse.json({
        success: true,
        message: paymentReleased
          ? 'تم تأكيد الاستلام بنجاح وتحرير الدفعة للمورد!'
          : 'تم تأكيد الاستلام بنجاح!',
        data: {
          order_id: orderId,
          order_number: order.order_number,
          status: paymentReleased ? 'completed' : 'delivered',
          payment_released: paymentReleased,
        },
      })
    }

    // ==========================================
    // REPORT ISSUE PATH (DISPUTE)
    // ==========================================
    else {
      // 1. Create dispute
      const { data: newDispute, error: disputeError } = await supabase
        .from('disputes')
        .insert({
          order_id: orderId,
          reported_by: user.id,
          issue_type: 'delivery_issue',
          description: issues,
          status: 'pending',
        })
        .select()
        .single()

      if (disputeError) {
        console.error('Error creating dispute:', disputeError)
        return NextResponse.json(
          { error: 'Failed to create dispute' },
          { status: 500 }
        )
      }

      // 2. Update order status to disputed
      await supabase
        .from('orders')
        .update({
          status: 'disputed',
          updated_at: now,
        })
        .eq('id', orderId)

      // 3. Freeze payment
      await supabase
        .from('payments')
        .update({
          status: 'frozen',
          frozen_at: now,
          updated_at: now,
        })
        .eq('order_id', orderId)

      // 4. Create order activity
      await supabase
        .from('order_activities')
        .insert({
          order_id: orderId,
          activity_type: 'dispute_created',
          description: 'Contractor reported delivery issue',
          metadata: {
            dispute_id: newDispute.id,
            issues: issues,
          },
          created_by: user.id,
        })

      // TODO: Send notifications
      // await NotificationService.notifyDisputeCreated(orderId)

      return NextResponse.json({
        success: true,
        message: 'تم الإبلاغ عن المشكلة بنجاح. سيتواصل معك فريق الدعم قريباً.',
        data: {
          order_id: orderId,
          order_number: order.order_number,
          status: 'disputed',
          dispute_id: newDispute.id,
        },
      })
    }
  } catch (error: any) {
    console.error('Confirm delivery error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process delivery confirmation' },
      { status: 500 }
    )
  }
}
