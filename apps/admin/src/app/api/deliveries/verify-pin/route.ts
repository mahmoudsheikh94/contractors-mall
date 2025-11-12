import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ApiErrors, ApiError, ErrorCodes, handleApiError } from '@contractors-mall/shared'
import { z } from 'zod'

/**
 * Zod validation schema for PIN verification
 */
const VerifyPinSchema = z.object({
  deliveryId: z.string().uuid('Invalid delivery ID format'),
  pin: z.string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits'),
})

// Maximum PIN attempts allowed
const MAX_PIN_ATTEMPTS = 3

/**
 * POST /api/deliveries/verify-pin
 *
 * Supplier confirms delivery by verifying PIN (≥120 JOD orders)
 * Part of the dual confirmation system - contractor must confirm after supplier.
 *
 * Security:
 * - Max 3 PIN attempts per delivery
 * - PIN is 4-digit numeric code
 * - Attempts are tracked and enforced
 *
 * Flow:
 * 1. Verify PIN against stored value
 * 2. Mark supplier_confirmed = true
 * 3. Update order status to 'awaiting_contractor_confirmation'
 * 4. Wait for contractor to confirm before releasing payment
 */
export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const rawBody = await request.json()
    const validationResult = VerifyPinSchema.safeParse(rawBody)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      const messageAr = firstError.path[0] === 'pin'
        ? 'رمز PIN يجب أن يكون 4 أرقام'
        : 'المعلومات المطلوبة ناقصة'
      const error = new ApiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${firstError.message}`,
        400,
        {
          messageAr,
          details: { field: firstError.path.join('.'), issue: firstError.message }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const { deliveryId, pin } = validationResult.data

    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const error = ApiErrors.unauthorized()
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Get delivery details with order information
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select(`
        delivery_id,
        order_id,
        confirmation_pin,
        pin_attempts,
        pin_verified,
        pin_verified_at,
        completed_at,
        supplier_confirmed,
        contractor_confirmed,
        order:orders!inner(
          id,
          supplier_id,
          total_jod,
          status
        )
      `)
      .eq('delivery_id', deliveryId)
      .single()

    if (fetchError || !delivery) {
      console.error('Error fetching delivery:', fetchError)
      const error = new ApiError(
        ErrorCodes.NOT_FOUND,
        'Delivery not found',
        404,
        {
          messageAr: 'التوصيل غير موجود',
          details: { resource: 'Delivery', id: deliveryId }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Type assertion for nested order
    const order = Array.isArray(delivery.order) ? delivery.order[0] : delivery.order

    // Verify supplier owns this order
    if (order.supplier_id !== user.id) {
      const error = new ApiError(
        ErrorCodes.FORBIDDEN,
        'You do not own this delivery',
        403,
        {
          messageAr: 'غير مصرح لك بتأكيد هذا التوصيل',
          details: { reason: 'Unauthorized supplier access' }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Check if already completed/verified
    if (delivery.completed_at || delivery.pin_verified || delivery.supplier_confirmed) {
      const error = ApiErrors.businessRuleViolation(
        'Delivery already confirmed by supplier',
        'تم تأكيد هذا التوصيل مسبقاً'
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Check max attempts
    const currentAttempts = delivery.pin_attempts || 0
    if (currentAttempts >= MAX_PIN_ATTEMPTS) {
      const error = new ApiError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        `Maximum PIN attempts (${MAX_PIN_ATTEMPTS}) exceeded`,
        422,
        {
          messageAr: 'تجاوزت الحد الأقصى لمحاولات PIN',
          details: {
            max_attempts: MAX_PIN_ATTEMPTS,
            current_attempts: currentAttempts,
          }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Verify PIN
    if (pin !== delivery.confirmation_pin) {
      // Increment attempts
      const newAttempts = currentAttempts + 1
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          pin_attempts: newAttempts,
          updated_at: new Date().toISOString(),
        })
        .eq('delivery_id', deliveryId)

      if (updateError) {
        console.error('Error updating PIN attempts:', updateError)
      }

      const error = new ApiError(
        ErrorCodes.BUSINESS_RULE_VIOLATION,
        'Incorrect PIN code',
        422,
        {
          messageAr: 'رمز PIN غير صحيح',
          details: {
            remaining_attempts: MAX_PIN_ATTEMPTS - newAttempts,
            current_attempts: newAttempts,
          }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // PIN is correct - Complete delivery
    const now = new Date().toISOString()

    // Update delivery with PIN verification and supplier confirmation
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        pin_verified: true,
        pin_verified_at: now,
        supplier_confirmed: true,
        supplier_confirmed_at: now,
        updated_at: now,
      })
      .eq('delivery_id', deliveryId)

    if (updateError) {
      console.error('Error updating delivery:', updateError)
      const error = new ApiError(
        ErrorCodes.DATABASE_ERROR,
        'Database operation failed: update delivery',
        500,
        {
          messageAr: 'فشل تحديث التوصيل',
          details: process.env.NODE_ENV === 'development' ? updateError : undefined
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
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

    // Create order activity
    await supabase
      .from('order_activities')
      .insert({
        order_id: delivery.order_id,
        activity_type: 'delivery_confirmed_supplier',
        description: 'Supplier confirmed delivery with PIN verification',
        metadata: {
          delivery_id: deliveryId,
          pin_verified: true,
          confirmed_at: now,
        },
        created_by: user.id,
      })

    // TODO: Send notification to contractor to confirm delivery
    // await NotificationService.notifySupplierConfirmedDelivery(delivery.order_id)

    // NOTE: Payment release will happen when contractor confirms delivery
    // Payment is NOT released here - we need dual confirmation

    return NextResponse.json({
      success: true,
      message: 'تم تأكيد التوصيل من جانبك بنجاح. في انتظار تأكيد العميل لاستلام الطلب.',
      message_en: 'Delivery confirmed successfully. Waiting for customer confirmation.',
      data: {
        order_id: delivery.order_id,
        delivery_id: deliveryId,
        status: 'awaiting_contractor_confirmation',
        supplier_confirmed: true,
        contractor_confirmed: false,
        pin_verified: true,
      },
    })
  } catch (error) {
    console.error('Error in verify-pin:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
  }
}
