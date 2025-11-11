import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

/**
 * GET /api/admin/conversations/[id]
 *
 * Get a single conversation with all messages
 * Admin only
 */
export async function GET(
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
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const conversationId = params.id

    // Fetch conversation with all related data
    const { data: conversation, error: conversationError } = await supabase
      .from('admin_conversations')
      .select(`
        *,
        order:order_id (
          order_number,
          status,
          total_jod,
          contractor:contractor_id (
            full_name,
            email,
            phone
          ),
          supplier:supplier_id (
            business_name,
            contact_phone
          )
        ),
        closed_by_profile:closed_by (
          full_name
        ),
        participants:admin_conversation_participants (
          user_id,
          role,
          joined_at,
          last_read_at,
          user:user_id (
            full_name,
            email,
            role
          )
        ),
        messages:admin_messages (
          id,
          sender_id,
          content,
          attachments,
          is_read,
          is_internal,
          created_at,
          read_at,
          sender:sender_id (
            full_name,
            role
          )
        )
      `)
      .eq('id', conversationId)
      .single()

    if (conversationError) {
      if (conversationError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      trackAPIError(
        new Error(conversationError.message),
        `/api/admin/conversations/${conversationId}`,
        'GET',
        500,
        { conversationId }
      )
      return NextResponse.json(
        { error: 'Failed to fetch conversation' },
        { status: 500 }
      )
    }

    // Mark messages as read for this user
    await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    })

    return NextResponse.json({ conversation })
  } catch (error: any) {
    console.error('Get conversation error:', error)
    trackAPIError(
      error,
      `/api/admin/conversations/${params.id}`,
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/conversations/[id]
 *
 * Update conversation (status, priority, etc.)
 * Admin only
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { status, priority, subject } = body

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      if (!['open', 'closed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        )
      }
      updates.status = status

      if (status === 'closed') {
        updates.closed_at = new Date().toISOString()
        updates.closed_by = user.id
      }
    }

    if (priority) {
      if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        )
      }
      updates.priority = priority
    }

    if (subject && subject.trim()) {
      updates.subject = subject.trim()
    }

    // Update conversation
    const { data: conversation, error: updateError } = await supabase
      .from('admin_conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      trackAPIError(
        new Error(updateError.message),
        `/api/admin/conversations/${conversationId}`,
        'PATCH',
        500,
        { conversationId, updates }
      )
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    // Track event
    trackEvent('Admin: Update Conversation', {
      admin_id: user.id,
      admin_name: profile.full_name,
      conversation_id: conversationId,
      updates,
    }, 'info')

    return NextResponse.json({
      conversation,
      message: 'Conversation updated successfully'
    })
  } catch (error: any) {
    console.error('Update conversation error:', error)
    trackAPIError(
      error,
      `/api/admin/conversations/${params.id}`,
      'PATCH',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
