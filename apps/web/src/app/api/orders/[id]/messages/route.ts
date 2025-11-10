import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/orders/[id]/messages
 *
 * Get all messages for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const { searchParams } = new URL(request.url)

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this order
    const { data: order } = await supabase
      .from('orders')
      .select('id, contractor_id, supplier_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user is the contractor or the supplier owner
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, owner_id')
      .eq('id', order.supplier_id)
      .single()

    const isContractor = order.contractor_id === user.id
    const isSupplier = supplier?.owner_id === user.id

    if (!isContractor && !isSupplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch messages with sender info and attachments
    const { data: messages, error: messagesError, count } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          email
        ),
        attachments:message_attachments (
          id,
          file_url,
          file_name,
          file_type,
          file_size_bytes
        )
      `, { count: 'exact' })
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Mark messages as read if user is not the sender
    const unreadMessageIds = messages
      ?.filter(m => !m.is_read && m.sender_id !== user.id)
      .map(m => m.id) || []

    if (unreadMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadMessageIds)
    }

    // Get unread count for this order (for the current user)
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    return NextResponse.json({
      messages: messages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      unreadCount: unreadCount || 0,
      currentUserType: isContractor ? 'contractor' : 'supplier'
    })
  } catch (error: any) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/orders/[id]/messages
 *
 * Send a message on an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const body = await request.json()
    const { message, attachments } = body

    // Validate message
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify user has access to this order
    const { data: order } = await supabase
      .from('orders')
      .select('id, contractor_id, supplier_id, order_number')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user is the contractor or the supplier owner
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, owner_id, business_name')
      .eq('id', order.supplier_id)
      .single()

    const isContractor = order.contractor_id === user.id
    const isSupplier = supplier?.owner_id === user.id

    if (!isContractor && !isSupplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Determine sender type
    let senderType = 'contractor'
    if (isSupplier) senderType = 'supplier'
    else if (userProfile.role === 'admin') senderType = 'admin'
    else if (userProfile.role === 'driver') senderType = 'driver'

    // Create message
    const { data: newMessage, error: insertError } = await (supabase
      .from('messages')
      .insert as any)({
      order_id: orderId,
      sender_id: user.id,
      sender_type: senderType,
      message: message.trim(),
      is_read: false
    })
    .select(`
      *,
      sender:sender_id (
        id,
        full_name,
        email
      )
    `)
    .single()

    if (insertError) {
      console.error('Message insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentRecords = attachments.map((att: any) => ({
        message_id: newMessage.id,
        file_url: att.url,
        file_name: att.name,
        file_type: att.type,
        file_size_bytes: att.size
      }))

      const { error: attachmentError } = await (supabase
        .from('message_attachments')
        .insert as any)(attachmentRecords)

      if (attachmentError) {
        console.error('Attachment insert error:', attachmentError)
        // Don't fail the whole message if attachments fail
      } else {
        // Fetch attachments for the response
        const { data: messageAttachments } = await supabase
          .from('message_attachments')
          .select('*')
          .eq('message_id', newMessage.id)

        newMessage.attachments = messageAttachments || []
      }
    }

    // Create notification for the recipient
    const recipientId = isContractor ? supplier?.owner_id : order.contractor_id
    if (recipientId) {
      await (supabase
        .from('in_app_notifications')
        .insert as any)({
        user_id: recipientId,
        type: 'new_message',
        title: 'رسالة جديدة',
        message: `رسالة جديدة على الطلب #${order.order_number}`,
        data: {
          order_id: orderId,
          order_number: order.order_number,
          message_id: newMessage.id,
          sender_name: newMessage.sender.full_name
        }
      })

      // Add to email queue for notification
      await (supabase
        .from('email_queue')
        .insert as any)({
        recipient_email: isContractor ? supplier?.owner_id : order.contractor_id, // Would need to fetch email
        template_id: 'new_message',
        data: {
          order_number: order.order_number,
          message_preview: message.substring(0, 100),
          sender_name: newMessage.sender.full_name,
          sender_type: senderType
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: newMessage
    })
  } catch (error: any) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
