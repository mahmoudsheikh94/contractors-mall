import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiErrors, ApiError, ErrorCodes, handleApiError, OrderStatus } from '@contractors-mall/shared'
import { z } from 'zod'
import { updateOrderStatus } from '@/lib/services/orderStatus'

/**
 * Zod validation schema for delivery confirmation
 */
const ConfirmDeliverySchema = z.object({
  confirmed: z.boolean({
    required_error: 'Confirmation status is required',
    invalid_type_error: 'Confirmation must be a boolean',
  }),
  issues: z.string().optional(),
}).refine(
  (data) => {
    // If not confirmed, issues must be provided
    if (data.confirmed === false && !data.issues?.trim()) {
      return false
    }
    return true
  },
  {
    message: 'Issues description is required when reporting problems',
    path: ['issues'],
  }
)

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
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { orderId } = await params

    // Parse and validate request body
    const rawBody = await request.json()
    const validationResult = ConfirmDeliverySchema.safeParse(rawBody)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      const error = ApiErrors.validationError(
        firstError.path.join('.'),
        firstError.message
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const { confirmed, issues } = validationResult.data

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      const error = ApiErrors.unauthorized()
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Get the order and verify contractor ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, contractor_id, supplier_id, status, total_jod')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      const error = ApiErrors.notFound('Order', orderId)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Verify contractor ownership
    if (order.contractor_id !== user.id) {
      const error = ApiErrors.forbidden({ reason: 'You do not own this order' })
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Validate order status
    const orderStatus = order.status as OrderStatus
    if (orderStatus !== 'awaiting_contractor_confirmation') {
      const error = ApiErrors.businessRuleViolation(
        `Order must be awaiting your confirmation. Current status: ${orderStatus}`,
        `يجب أن يكون الطلب بانتظار تأكيدك. الحالة الحالية: ${orderStatus}`
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Get delivery record and verify supplier confirmed first
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('deliveries')
      .select('delivery_id, supplier_confirmed, contractor_confirmed')
      .eq('order_id', orderId)
      .single()

    if (deliveryError || !deliveryData) {
      const error = ApiErrors.notFound('Delivery record', orderId)
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const delivery = deliveryData as unknown as DeliveryConfirmation

    if (!delivery.supplier_confirmed) {
      const error = ApiErrors.businessRuleViolation(
        'Supplier must confirm delivery first',
        'المورد لم يؤكد التوصيل بعد. يرجى الانتظار.'
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    if (delivery.contractor_confirmed) {
      const error = ApiErrors.businessRuleViolation(
        'You have already confirmed receipt of this delivery',
        'لقد قمت بتأكيد استلام هذا الطلب بالفعل.'
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
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
        const error = ApiErrors.databaseError('confirm delivery', confirmError)
        return NextResponse.json(error.toResponseObject(), { status: error.status })
      }

      // 2. Update order status to delivered using centralized helper (sends email)
      const statusUpdate = await updateOrderStatus(supabase, orderId, 'delivered')

      if (!statusUpdate.success) {
        console.error('❌ ERROR updating order status:', statusUpdate.error)

        // CRITICAL: Order status update failed!
        // This means payment won't be released and order will be stuck
        // Return error to user instead of silently continuing
        const error = new ApiError(
          ErrorCodes.DATABASE_ERROR,
          `Failed to update order status: ${statusUpdate.error || 'Unknown error'}`,
          500,
          {
            messageAr: 'فشل تحديث حالة الطلب. يرجى الاتصال بالدعم.',
            details: {
              step: 'order_status_update',
              delivery_confirmed: true, // Delivery was confirmed successfully
              order_status_updated: false,
            }
          }
        )
        return NextResponse.json(error.toResponseObject(), { status: error.status })
      }

      console.log('✅ Order status updated successfully to delivered, email sent:', statusUpdate.emailSent)

      // 3. Check if there are any active disputes
      const { data: dispute } = await supabase
        .from('disputes')
        .select('id, status')
        .eq('order_id', orderId)
        .in('status', ['opened', 'investigating', 'escalated'])
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
          .eq('status', 'held')

        if (paymentError) {
          console.error('❌ Error releasing payment:', {
            orderId,
            code: paymentError.code,
            message: paymentError.message,
            details: paymentError.details,
          })
          // Don't fail the request - payment can be released manually
        } else {
          paymentReleased = true
          console.log('✅ Payment released successfully for order:', orderId)

          // 5. Update order status to completed using centralized helper (sends email)
          const completionUpdate = await updateOrderStatus(supabase, orderId, 'completed')

          if (!completionUpdate.success) {
            console.error('❌ Error updating order to completed:', completionUpdate.error)
            // Don't fail - order is still marked as delivered
          } else {
            console.log('✅ Order status updated to completed, email sent:', completionUpdate.emailSent)
          }
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
      // NOTE: 'disputed' status not yet in production database
      // Will fail until migration 20251113000000 is applied
      // TODO: Remove type casts after running migrations in production

      // 1. Create dispute
      const { data: newDispute, error: disputeError } = await supabase
        .from('disputes')
        .insert({
          order_id: orderId,
          opened_by: user.id,
          reason: issues!, // Non-null assertion safe due to Zod validation
          description: null,
          status: 'opened',
        })
        .select()
        .single()

      if (disputeError) {
        console.error('Error creating dispute:', disputeError)
        const error = ApiErrors.databaseError('create dispute', disputeError)
        return NextResponse.json(error.toResponseObject(), { status: error.status })
      }

      // 2. Update order status to disputed using centralized helper (sends email)
      const disputeStatusUpdate = await updateOrderStatus(supabase, orderId, 'disputed')

      if (!disputeStatusUpdate.success) {
        console.error('❌ Error updating order to disputed:', disputeStatusUpdate.error)
        // Continue anyway - dispute was created successfully
      } else {
        console.log('✅ Order status updated to disputed, email sent:', disputeStatusUpdate.emailSent)
      }

      // 3. Freeze payment (note: 'frozen' status may not exist in production yet)
      await supabase
        .from('payments')
        .update({
          status: 'held', // Keep as held instead of frozen until schema updated
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
    const apiError = handleApiError(error)
    return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
  }
}
