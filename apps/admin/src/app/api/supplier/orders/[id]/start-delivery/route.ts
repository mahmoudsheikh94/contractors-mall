import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/supplier/orders/[id]/start-delivery
 *
 * Marks the delivery as started by the supplier.
 * Updates order status to 'in_delivery' and sets delivery_started_at timestamp.
 *
 * Requirements:
 * - Supplier must own the order
 * - Order status must be 'confirmed' (supplier has accepted)
 * - Delivery must not already be started
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id

    // Get current user and verify authentication
    const { data: { user }, error: userError } = (await supabase.auth.getUser()) as any

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the order and verify supplier ownership
    const { data: order, error: orderError } = (await supabase
      .from('orders')
      .select('id, order_number, supplier_id, status, total_jod')
      .eq('id', orderId)
      .single()) as any

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify supplier ownership
    const { data: supplier } = (await supabase
      .from('suppliers')
      .select('id, business_name')
      .eq('id', order.supplier_id)
      .eq('owner_id', user.id)
      .maybeSingle()) as any

    if (!supplier) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this order' },
        { status: 403 }
      )
    }

    // Validate order status
    if (order.status !== 'confirmed') {
      return NextResponse.json(
        {
          error: 'Invalid order status',
          message: `Order must be in 'confirmed' status to start delivery. Current status: ${order.status}`,
        },
        { status: 400 }
      )
    }

    // Check if delivery already started
    const { data: delivery } = (await supabase
      .from('deliveries')
      .select('id, delivery_started_at')
      .eq('order_id', orderId)
      .maybeSingle()) as any

    if (delivery?.delivery_started_at) {
      return NextResponse.json(
        {
          error: 'Delivery already started',
          message: `Delivery was started at ${new Date(delivery.delivery_started_at).toLocaleString('ar-JO')}`,
        },
        { status: 400 }
      )
    }

    // Start a Supabase transaction
    // 1. Update order status to 'in_delivery'
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'in_delivery',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError)
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      )
    }

    // 2. Update delivery record with started timestamp
    const { error: deliveryUpdateError } = await supabase
      .from('deliveries')
      .update({
        delivery_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)

    if (deliveryUpdateError) {
      console.error('Error updating delivery record:', deliveryUpdateError)
      // Rollback order status
      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId)

      return NextResponse.json(
        { error: 'Failed to update delivery record' },
        { status: 500 }
      )
    }

    // 3. Create order activity log
    const { error: activityError } = await supabase
      .from('order_activities')
      .insert({
        order_id: orderId,
        activity_type: 'delivery_started',
        description: `${supplier.business_name} started delivery`,
        metadata: {
          started_at: new Date().toISOString(),
          started_by: user.id,
          supplier_name: supplier.business_name,
        },
        created_by: user.id,
      })

    if (activityError) {
      console.error('Error creating activity log:', activityError)
      // Don't fail the request, just log the error
    }

    // 4. TODO: Send notification to contractor
    // await NotificationService.notifyDeliveryStarted(orderId)

    return NextResponse.json({
      success: true,
      message: 'Delivery started successfully',
      data: {
        order_id: orderId,
        order_number: order.order_number,
        status: 'in_delivery',
        started_at: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Start delivery error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start delivery' },
      { status: 500 }
    )
  }
}
