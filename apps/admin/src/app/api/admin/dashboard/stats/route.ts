import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError } from '@/lib/monitoring'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard/stats
 *
 * Fetches quick stats for admin dashboard
 * Shows key metrics across the platform
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

    // Get time range from query params (defaults to last 24 hours for "recent" metrics)
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'

    // Calculate date for time range
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Fetch all stats in parallel
    const [
      ordersTotal,
      ordersRecent,
      ordersPending,
      ordersDisputed,
      suppliersTotal,
      suppliersUnverified,
      contractorsTotal,
      contractorsRecent,
      disputesOpen,
      paymentsEscrow,
      revenueTotal,
    ] = await Promise.all([
      // Total orders
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true }),

      // Recent orders (based on time range)
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString()),

      // Pending orders (confirmed status)
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'confirmed'),

      // Disputed orders (count orders with associated disputes)
      supabase
        .from('disputes')
        .select('order_id', { count: 'exact', head: true }),

      // Total suppliers
      supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true }),

      // Unverified suppliers
      supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true })
        .eq('is_verified', false),

      // Total contractors
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor'),

      // Recent contractors (based on time range)
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor')
        .gte('created_at', startDate.toISOString()),

      // Open disputes
      supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .in('status', ['opened', 'investigating']),

      // Payments in escrow
      supabase
        .from('payments')
        .select('amount_jod')
        .eq('status', 'held'),

      // Total revenue (completed orders)
      supabase
        .from('orders')
        .select('total_jod')
        .eq('status', 'completed'),
    ])

    // Calculate total escrow amount
    const escrowAmount = paymentsEscrow.data?.reduce((sum, payment) => sum + (payment.amount_jod || 0), 0) || 0

    // Calculate total revenue
    const totalRevenue = revenueTotal.data?.reduce((sum, order) => sum + (order.total_jod || 0), 0) || 0

    // Get recent activity count
    const { count: recentActivityCount } = await supabase
      .from('admin_activity_feed')
      .select('*', { count: 'exact', head: true })
      .gte('event_time', startDate.toISOString())

    // Get unread messages count for admins
    const { data: unreadMessages } = await supabase
      .rpc('get_unread_messages_count', { p_user_id: user.id })

    const stats = {
      orders: {
        total: ordersTotal.count || 0,
        recent: ordersRecent.count || 0,
        pending: ordersPending.count || 0,
        disputed: ordersDisputed.count || 0,
      },
      suppliers: {
        total: suppliersTotal.count || 0,
        unverified: suppliersUnverified.count || 0,
        verified: (suppliersTotal.count || 0) - (suppliersUnverified.count || 0),
      },
      contractors: {
        total: contractorsTotal.count || 0,
        recent: contractorsRecent.count || 0,
      },
      disputes: {
        open: disputesOpen.count || 0,
      },
      payments: {
        escrowAmount: escrowAmount,
        totalRevenue: totalRevenue,
      },
      activity: {
        recentCount: recentActivityCount || 0,
        unreadMessages: unreadMessages || 0,
      },
      timeRange,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    trackAPIError(
      error,
      '/api/admin/dashboard/stats',
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
