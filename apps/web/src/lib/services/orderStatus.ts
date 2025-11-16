/**
 * Centralized Order Status Management Service
 * ==========================================
 *
 * This service provides a single source of truth for all order status updates.
 * It ensures:
 * - Type-safe status transitions
 * - Automatic email notifications to contractors
 * - Consistent logging and error handling
 * - Non-blocking email delivery (failures don't block orders)
 *
 * Usage:
 * ```typescript
 * import { updateOrderStatus } from '@/lib/services/orderStatus'
 *
 * await updateOrderStatus(supabase, orderId, 'in_delivery')
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { sendOrderStatusEmail } from '../email/resend'

/**
 * Valid order status values
 * These match the order_status enum in the database
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_delivery'
  | 'awaiting_contractor_confirmation'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'disputed'

/**
 * Status update result
 */
interface StatusUpdateResult {
  success: boolean
  error?: string
  emailSent?: boolean
}

/**
 * Human-readable status messages in Arabic
 * Used for email notifications
 */
const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: 'طلبك قيد المعالجة',
  confirmed: 'تم تأكيد طلبك وجاري التحضير للتوصيل',
  in_delivery: 'طلبك في الطريق إليك',
  awaiting_contractor_confirmation: 'تم توصيل طلبك، يرجى التأكيد',
  delivered: 'تم تسليم طلبك بنجاح',
  completed: 'تم إكمال طلبك',
  cancelled: 'تم إلغاء طلبك',
  rejected: 'تم رفض طلبك',
  disputed: 'تم فتح بلاغ على طلبك'
}

/**
 * Updates an order's status and sends appropriate email notification
 *
 * @param supabase - Supabase client (authenticated)
 * @param orderId - UUID of the order to update
 * @param newStatus - New status to set
 * @param additionalData - Optional additional fields to update (e.g., disputed_at)
 * @returns Promise with success status
 *
 * @example
 * ```typescript
 * // Simple status update
 * await updateOrderStatus(supabase, orderId, 'in_delivery')
 *
 * // With additional data
 * await updateOrderStatus(supabase, orderId, 'disputed', {
 *   disputed_at: new Date().toISOString(),
 *   dispute_reason: 'Items damaged'
 * })
 * ```
 */
export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  newStatus: OrderStatus,
  additionalData?: Record<string, any>
): Promise<StatusUpdateResult> {
  try {
    // 1. Get order data including contractor email
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        contractor_id,
        profiles!orders_contractor_id_fkey (
          email
        )
      `)
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      console.error('[OrderStatus] Failed to fetch order:', fetchError)
      return {
        success: false,
        error: 'Order not found'
      }
    }

    // 2. Update order status in database
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...additionalData
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error('[OrderStatus] Failed to update order status:', updateError)
      return {
        success: false,
        error: 'Failed to update status'
      }
    }

    console.log(`[OrderStatus] Updated order ${order.order_number} to status: ${newStatus}`)

    // 3. Send email notification (non-blocking)
    // Only send emails for statuses that should notify contractors
    const shouldNotify = [
      'confirmed',
      'in_delivery',
      'awaiting_contractor_confirmation',
      'delivered',
      'completed',
      'cancelled',
      'disputed'
    ].includes(newStatus)

    let emailSent = false

    if (shouldNotify && order.profiles?.email) {
      const contractorEmail = (order.profiles as any).email

      // Send email asynchronously without blocking the response
      sendOrderStatusEmail(
        contractorEmail,
        order.order_number,
        newStatus,
        STATUS_MESSAGES[newStatus]
      )
        .then(() => {
          console.log(`[OrderStatus] Email sent for order ${order.order_number} (${newStatus})`)
        })
        .catch(err => {
          console.error(`[OrderStatus] Failed to send email for order ${order.order_number}:`, err)
          // Don't fail the entire operation if email fails
        })

      emailSent = true
    }

    return {
      success: true,
      emailSent
    }
  } catch (error) {
    console.error('[OrderStatus] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Helper function to check if a status transition is valid
 * This prevents invalid status flows (e.g., completed → pending)
 *
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @returns true if transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  // Define valid transitions
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled', 'rejected'],
    confirmed: ['in_delivery', 'cancelled', 'disputed'],
    in_delivery: ['awaiting_contractor_confirmation', 'delivered', 'disputed'],
    awaiting_contractor_confirmation: ['delivered', 'completed', 'disputed'],
    delivered: ['completed', 'disputed'],
    completed: [], // Final state
    cancelled: [], // Final state
    rejected: [], // Final state
    disputed: ['completed', 'cancelled'], // Can be resolved
  }

  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Get human-readable status message
 *
 * @param status - Order status
 * @returns Arabic status message
 */
export function getStatusMessage(status: OrderStatus): string {
  return STATUS_MESSAGES[status] || status
}
