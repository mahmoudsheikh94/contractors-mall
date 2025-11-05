import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/notifications
 *
 * Get in-app notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Query params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const offset = (page - 1) * limit

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: notifications, error: notificationsError, count } = await query

    if (notificationsError) {
      console.error('Notifications fetch error:', notificationsError)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      unreadCount: unreadCount || 0
    })
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/supplier/notifications
 *
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { notificationIds, markAll } = body

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (markAll) {
      // Mark all notifications as read
      const { error: updateError } = await supabase
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) {
        console.error('Update notifications error:', updateError)
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        )
      }
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const { error: updateError } = await supabase
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationIds)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update notifications error:', updateError)
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'No notifications to update' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث الإشعارات بنجاح'
    })
  } catch (error: any) {
    console.error('Update notifications error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    )
  }
}