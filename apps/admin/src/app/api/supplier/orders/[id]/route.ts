import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/supplier/orders/[id]
 *
 * Updates order fields (delivery_instructions, special_requests, internal_reference)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const body = await request.json()
    const { delivery_instructions, special_requests, internal_reference } = body

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify supplier ownership
    const { data: order } = await supabase
      .from('orders')
      .select('id, supplier_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', order.supplier_id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}
    if (delivery_instructions !== undefined) {
      updateData.delivery_instructions = delivery_instructions
    }
    if (special_requests !== undefined) {
      updateData.special_requests = special_requests
    }
    if (internal_reference !== undefined) {
      updateData.internal_reference = internal_reference
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Order update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // Log activity for the changes
    const activityDescriptions: string[] = []
    if (delivery_instructions !== undefined) {
      activityDescriptions.push('حدّث تعليمات التوصيل')
    }
    if (special_requests !== undefined) {
      activityDescriptions.push('حدّث الطلبات الخاصة')
    }
    if (internal_reference !== undefined) {
      activityDescriptions.push('حدّث الرقم المرجعي الداخلي')
    }

    if (activityDescriptions.length > 0) {
      await (supabase.from('order_activities').insert as any)({
        order_id: orderId,
        activity_type: 'edited',
        description: activityDescriptions.join(' و '),
        created_by: user.id,
        metadata: {
          fields_updated: Object.keys(updateData),
        },
      })
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'تم تحديث الطلب بنجاح',
    })
  } catch (error: any) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    )
  }
}
