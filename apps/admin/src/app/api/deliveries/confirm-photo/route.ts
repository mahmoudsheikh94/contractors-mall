import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ApiErrors, ApiError, ErrorCodes, handleApiError } from '@contractors-mall/shared'
import { z } from 'zod'

/**
 * Zod validation schema for photo delivery confirmation
 */
const ConfirmPhotoSchema = z.object({
  deliveryId: z.string().uuid('Invalid delivery ID format'),
  photoUrl: z.string().url('Invalid photo URL').min(1, 'Photo URL is required'),
})

/**
 * POST /api/deliveries/confirm-photo
 *
 * Supplier confirms delivery by uploading proof photo (<120 JOD orders)
 * Part of the dual confirmation system - contractor must confirm after supplier.
 *
 * Flow:
 * 1. Upload photo proof
 * 2. Mark supplier_confirmed = true
 * 3. Update order status to 'awaiting_contractor_confirmation'
 * 4. Wait for contractor to confirm before releasing payment
 */
export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const rawBody = await request.json()
    const validationResult = ConfirmPhotoSchema.safeParse(rawBody)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      const error = ApiErrors.validationError(
        firstError.path.join('.'),
        firstError.message
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const { deliveryId, photoUrl } = validationResult.data

    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const error = ApiErrors.unauthorized()
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Get the supplier owned by this user
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (supplierError || !supplier) {
      console.error('Error fetching supplier:', supplierError)
      const error = new ApiError(
        ErrorCodes.FORBIDDEN,
        'No supplier account found for this user',
        403,
        {
          messageAr: 'لا يوجد حساب مورد لهذا المستخدم',
          details: { reason: 'No supplier account' }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Get delivery details with order information
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select(`
        delivery_id,
        order_id,
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
    if (order.supplier_id !== supplier.id) {
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

    // Check if already completed
    if (delivery.completed_at || delivery.supplier_confirmed) {
      const error = ApiErrors.businessRuleViolation(
        'Delivery already confirmed by supplier',
        'تم تأكيد هذا التوصيل مسبقاً'
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const now = new Date().toISOString()

    // Update delivery with photo and mark supplier as confirmed
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        photo_url: photoUrl,
        photo_uploaded_at: now,
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
        description: 'Supplier confirmed delivery with photo proof',
        metadata: {
          delivery_id: deliveryId,
          photo_url: photoUrl,
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
        photo_url: photoUrl,
      },
    })
  } catch (error) {
    console.error('Error in confirm-photo:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
  }
}
