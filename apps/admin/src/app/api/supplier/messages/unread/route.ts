import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/messages/unread
 *
 * Get count of unread messages for the supplier
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier info
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Get all order IDs for this supplier
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('supplier_id', supplier.id)

    const orderIds = orders?.map(o => o.id) || []

    if (orderIds.length === 0) {
      return NextResponse.json({
        unreadCount: 0,
        unreadByOrder: {}
      })
    }

    // Get unread messages count
    const { count: totalUnread } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('order_id', orderIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    // Get unread count per order
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('order_id')
      .in('order_id', orderIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    // Group by order
    const unreadByOrder = unreadMessages?.reduce((acc: any, msg) => {
      acc[msg.order_id] = (acc[msg.order_id] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent unread messages with order info
    const { data: recentMessages } = await supabase
      .from('messages')
      .select(`
        id,
        message,
        created_at,
        order:order_id (
          id,
          order_number
        ),
        sender:sender_id (
          id,
          full_name
        )
      `)
      .in('order_id', orderIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      unreadCount: totalUnread || 0,
      unreadByOrder,
      recentMessages: recentMessages || []
    })
  } catch (error: any) {
    console.error('Get unread messages error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread messages' },
      { status: 500 }
    )
  }
}