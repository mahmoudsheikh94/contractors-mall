import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering to avoid static generation errors with cookies
export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/mark-read
 *
 * Mark notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { notificationIds } = body

    // Validate input
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark notifications as read (only user's own notifications)
    const { error: updateError } = await supabase
      .from('in_app_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notificationIds)
      .eq('user_id', user.id)  // Security: only update own notifications

    if (updateError) {
      console.error('Mark read error:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      markedCount: notificationIds.length
    })
  } catch (error: any) {
    console.error('Mark notifications as read error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/mark-read
 *
 * Mark all notifications as read for current user
 */
export async function PUT() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all unread notifications as read
    const { error: updateError } = await supabase
      .from('in_app_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (updateError) {
      console.error('Mark all read error:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error: any) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}
