import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/messages/[id]/read
 *
 * Mark a message as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const messageId = params.id

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get message to verify access
    const { data: message } = await supabase
      .from('messages')
      .select('id, sender_id, order_id, is_read')
      .eq('id', messageId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // User can only mark as read if they're not the sender
    if (message.sender_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot mark own message as read' },
        { status: 400 }
      )
    }

    // Verify user has access to the order
    const { data: order } = await supabase
      .from('orders')
      .select('id, contractor_id, supplier_id')
      .eq('id', message.order_id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('owner_id')
      .eq('id', order.supplier_id)
      .single()

    const hasAccess = order.contractor_id === user.id || supplier?.owner_id === user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mark as read if not already
    if (!message.is_read) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (updateError) {
        console.error('Update message error:', updateError)
        return NextResponse.json(
          { error: 'Failed to mark message as read' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Message marked as read'
    })
  } catch (error: any) {
    console.error('Mark message read error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mark message as read' },
      { status: 500 }
    )
  }
}