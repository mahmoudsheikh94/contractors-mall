import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

/**
 * GET /api/supplier/contractors/top
 *
 * Get top contractors by revenue for the supplier
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Query params
    const limit = parseInt(searchParams.get('limit') || '10')
    const period = searchParams.get('period') || 'all_time' // all_time, last_30_days, last_90_days, last_year

    // Get current user
    const { data: { user }, error: userError } = (await supabase.auth.getUser()) as any

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier info
    const { data: supplier } = (await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()) as any

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Build date filter
    let dateFilter = ''
    if (period === 'last_30_days') {
      dateFilter = `AND o.created_at >= NOW() - INTERVAL '30 days'`
    } else if (period === 'last_90_days') {
      dateFilter = `AND o.created_at >= NOW() - INTERVAL '90 days'`
    } else if (period === 'last_year') {
      dateFilter = `AND o.created_at >= NOW() - INTERVAL '1 year'`
    }

    // Query for top contractors with raw SQL for better performance
    const { data: topContractors, error: queryError } = await (supabase as any)
      .rpc('get_top_contractors', {
        p_supplier_id: supplier.id,
        p_period: period,
        p_limit: limit
      })

    // If RPC doesn't exist, fall back to manual query
    if (queryError) {
      // Fallback query using the view
      const { data: contractors } = await (supabase as any)
        .from('contractor_insights')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('total_spent', { ascending: false })
        .limit(limit)

      // Transform data for consistency
      const transformedData = contractors?.map((c: any, index: number) => ({
        rank: index + 1,
        contractor_id: c.contractor_id,
        contractor_name: c.contractor_name,
        contractor_email: c.contractor_email,
        contractor_phone: c.contractor_phone,
        total_orders: c.total_orders,
        total_revenue: c.total_spent,
        average_order_value: c.average_order_value,
        last_order_date: c.last_order_date,
        days_since_last_order: c.days_since_last_order,
        orders_last_30_days: c.orders_last_30_days,
        customer_segment: determineCustomerSegment({
          total_orders: c.total_orders,
          average_order_value: c.average_order_value,
          orders_last_30_days: c.orders_last_30_days,
          days_since_last_order: c.days_since_last_order
        }),
        trend: calculateTrend(c.orders_last_30_days, c.orders_last_90_days)
      })) || []

      return NextResponse.json({
        contractors: transformedData,
        period,
        total: transformedData.length
      })
    }

    // Transform and enrich data
    const enrichedContractors = (topContractors || []).map((contractor: any, index: number) => ({
      ...contractor,
      rank: index + 1,
      customer_segment: determineCustomerSegment(contractor),
      trend: calculateTrend(contractor.orders_last_30_days, contractor.orders_last_90_days)
    }))

    return NextResponse.json({
      contractors: enrichedContractors,
      period,
      total: enrichedContractors.length
    })
  } catch (error: any) {
    console.error('Get top contractors error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch top contractors' },
      { status: 500 }
    )
  }
}

// Helper functions
function determineCustomerSegment(data: any): string {
  const { total_orders, average_order_value, orders_last_30_days, days_since_last_order } = data

  // VIP: High value, high frequency
  if (total_orders >= 10 && average_order_value >= 150 && orders_last_30_days >= 2) {
    return 'vip'
  }

  // Loyal: Regular orders
  if (total_orders >= 5 && orders_last_30_days >= 1) {
    return 'loyal'
  }

  // At Risk: Was active but declining
  if (total_orders >= 5 && orders_last_30_days === 0 && days_since_last_order > 60) {
    return 'at_risk'
  }

  // Occasional: Low frequency
  if (total_orders >= 2) {
    return 'occasional'
  }

  // New: Just starting
  return 'new'
}

function calculateTrend(last30Days: number, last90Days: number): 'up' | 'down' | 'stable' {
  if (last90Days === 0) return 'stable'

  const monthlyAverage = last90Days / 3
  if (last30Days > monthlyAverage * 1.2) return 'up'
  if (last30Days < monthlyAverage * 0.8) return 'down'
  return 'stable'
}