import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Force dynamic rendering to avoid static generation errors with cookies
export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/unread
 *
 * Get unread notifications count and recent unread notifications for current user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    // Get recent unread notifications (last 10)
    const { data: notifications, error: notificationsError } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.error('Notifications fetch error:', notificationsError)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      unreadCount: unreadCount || 0,
      notifications: notifications || []
    })
  } catch (error: any) {
    console.error('Get unread notifications error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread notifications' },
      { status: 500 }
    )
  }
}
