import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError } from '@/lib/monitoring'

/**
 * GET /api/admin/dashboard/activity-feed
 *
 * Fetches unified activity feed from admin_activity_feed view
 * Shows recent events across orders, disputes, suppliers, payments
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
    const eventType = url.searchParams.get('eventType')
    const userId = url.searchParams.get('userId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query on the activity feed view
    let query = supabase
      .from('admin_activity_feed')
      .select(`
        event_type,
        reference_id,
        event_time,
        user_id,
        metadata,
        created_at
      `, { count: 'exact' })

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('event_time', startDate)
    }

    if (endDate) {
      query = query.lte('event_time', endDate)
    }

    // Apply pagination and ordering (already ordered by created_at DESC in view)
    query = query.range(offset, offset + limit - 1)

    const { data: activities, error: activitiesError, count } = await query

    if (activitiesError) {
      trackAPIError(
        new Error(activitiesError.message),
        '/api/admin/dashboard/activity-feed',
        'GET',
        500,
        { filters: { eventType, userId, startDate, endDate } }
      )
      return NextResponse.json(
        { error: 'Failed to fetch activity feed' },
        { status: 500 }
      )
    }

    // Enrich activities with user data
    const userIds = Array.from(new Set(activities?.map(a => a.user_id).filter(Boolean))) as string[]

    let users: any[] = []
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .in('id', userIds)

      users = usersData || []
    }

    // Create user lookup map
    const userMap = new Map(users.map(u => [u.id, u]))

    // Enrich activities with user info
    const enrichedActivities = activities?.map(activity => ({
      ...activity,
      user: activity.user_id ? userMap.get(activity.user_id) : null
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      activities: enrichedActivities,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        eventType,
        userId,
        startDate,
        endDate,
      }
    })
  } catch (error: any) {
    console.error('Activity feed error:', error)
    trackAPIError(
      error,
      '/api/admin/dashboard/activity-feed',
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}
