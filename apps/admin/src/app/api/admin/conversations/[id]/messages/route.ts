import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

/**
 * POST /api/admin/conversations/[id]/messages
 *
 * Send a message in a conversation
 * Admin only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const conversationId = params.id

    // Verify conversation exists and user is a participant
    const { data: conversation, error: convError } = await supabase
      .from('admin_conversations')
      .select(`
        id,
        status,
        participants:admin_conversation_participants!inner(user_id)
      `)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if conversation is closed
    if (conversation.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot send message to a closed conversation' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { content, isInternal, attachments } = body

    // Validate input
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('admin_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        is_internal: isInternal || false,
        attachments: attachments || null,
        is_read: false,
      })
      .select(`
        *,
        sender:sender_id (
          full_name,
          role
        )
      `)
      .single()

    if (messageError) {
      trackAPIError(
        new Error(messageError.message),
        `/api/admin/conversations/${conversationId}/messages`,
        'POST',
        500,
        { conversationId }
      )
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update conversation updated_at timestamp
    await supabase
      .from('admin_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Track event
    trackEvent('Admin: Send Message', {
      admin_id: user.id,
      admin_name: profile.full_name,
      conversation_id: conversationId,
      is_internal: isInternal,
      has_attachments: !!attachments && attachments.length > 0,
    }, 'info')

    return NextResponse.json(
      {
        message,
        success: true,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Send message error:', error)
    trackAPIError(
      error,
      `/api/admin/conversations/${params.id}/messages`,
      'POST',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
