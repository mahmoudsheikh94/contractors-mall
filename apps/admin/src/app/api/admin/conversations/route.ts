import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

/**
 * GET /api/admin/conversations
 *
 * List all conversations with filters
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const orderId = url.searchParams.get('orderId')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('admin_conversations')
      .select(`
        *,
        order:order_id (
          order_number,
          status,
          total_jod
        ),
        closed_by_profile:closed_by (
          full_name
        ),
        participants:admin_conversation_participants (
          user_id,
          role,
          last_read_at,
          user:user_id (
            full_name,
            email,
            role
          )
        ),
        messages:admin_messages (
          id,
          content,
          sender_id,
          is_read,
          created_at
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    // Order by updated_at (most recent first)
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: conversations, error: conversationsError, count } = await query

    if (conversationsError) {
      trackAPIError(
        new Error(conversationsError.message),
        '/api/admin/conversations',
        'GET',
        500,
        { filters: { status, priority, orderId } }
      )
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Enrich conversations with unread count and last message
    const enrichedConversations = conversations?.map(conv => {
      const messages = Array.isArray(conv.messages) ? conv.messages : []
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
      const unreadCount = messages.filter((m: any) => !m.is_read && m.sender_id !== user.id).length

      return {
        ...conv,
        lastMessage,
        unreadCount,
        messageCount: messages.length,
        // Remove full messages array to reduce payload
        messages: undefined,
      }
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      conversations: enrichedConversations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        status,
        priority,
        orderId,
      }
    })
  } catch (error: any) {
    console.error('List conversations error:', error)
    trackAPIError(
      error,
      '/api/admin/conversations',
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/conversations
 *
 * Create a new conversation
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { subject, orderId, participantIds, priority, initialMessage } = body

    // Validate input
    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      )
    }

    // Create conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('admin_conversations')
      .insert({
        subject: subject.trim(),
        order_id: orderId || null,
        priority: priority || 'normal',
        status: 'open',
      })
      .select()
      .single()

    if (conversationError) {
      trackAPIError(
        new Error(conversationError.message),
        '/api/admin/conversations',
        'POST',
        500,
        { subject, orderId }
      )
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Add admin as participant
    const participants = [
      {
        conversation_id: conversation.id,
        user_id: user.id,
        role: 'admin',
      },
      // Add other participants
      ...participantIds.map((userId: string) => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: 'customer',
      })),
    ]

    const { error: participantsError } = await supabase
      .from('admin_conversation_participants')
      .insert(participants)

    if (participantsError) {
      // Rollback conversation creation
      await supabase
        .from('admin_conversations')
        .delete()
        .eq('id', conversation.id)

      trackAPIError(
        new Error(participantsError.message),
        '/api/admin/conversations',
        'POST',
        500,
        { conversationId: conversation.id }
      )
      return NextResponse.json(
        { error: 'Failed to add participants' },
        { status: 500 }
      )
    }

    // Create initial message if provided
    if (initialMessage && initialMessage.trim()) {
      const { error: messageError } = await supabase
        .from('admin_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: initialMessage.trim(),
          is_internal: false,
        })

      if (messageError) {
        console.error('Failed to create initial message:', messageError)
        // Don't fail the whole operation if initial message fails
      }
    }

    // Track event
    trackEvent('Admin: Create Conversation', {
      admin_id: user.id,
      admin_name: profile.full_name,
      conversation_id: conversation.id,
      order_id: orderId,
      participant_count: participantIds.length,
    }, 'info')

    return NextResponse.json(
      {
        conversation,
        message: 'Conversation created successfully'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create conversation error:', error)
    trackAPIError(
      error,
      '/api/admin/conversations',
      'POST',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
