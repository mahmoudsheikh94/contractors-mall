import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/contractors/[id]
 *
 * Get detailed contractor profile and insights
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const contractorId = params.id

    // Get current user
    const { data: { user }, error: userError } = (await supabase.auth.getUser()) as any

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier info
    const { data: supplier } = await (supabase as any)
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Get contractor basic info
    const { data: contractor, error: contractorError } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, email, phone, created_at')
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .single()

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // Get contractor insights from the view
    const { data: insights } = await (supabase as any)
      .from('contractor_insights')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplier.id)
      .single()

    // Get lifetime value using the function
    const { data: lifetimeValue } = await (supabase as any)
      .rpc('get_contractor_lifetime_value', {
        p_contractor_id: contractorId,
        p_supplier_id: supplier.id
      })
      .single()

    // Get purchase frequency for last 12 months
    const { data: purchaseFrequency } = await (supabase as any)
      .rpc('get_contractor_purchase_frequency', {
        p_contractor_id: contractorId,
        p_supplier_id: supplier.id,
        p_period_days: 365
      })
      .single()

    // Get category preferences
    const { data: categoryPreferences } = await (supabase as any)
      .from('contractor_category_preferences')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplier.id)
      .order('total_spent_on_category', { ascending: false })
      .limit(5)

    // Get recent orders
    const { data: recentOrders } = await (supabase as any)
      .from('orders')
      .select('id, order_number, total_jod, status, created_at')
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get delivery addresses used
    const { data: deliveryAddresses } = await (supabase as any)
      .from('orders')
      .select('delivery_address')
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    // Get unique addresses
    const uniqueAddresses = Array.from(new Set(deliveryAddresses?.map((d: any) => d.delivery_address) || []))

    // Combine all data
    const profile = {
      ...contractor,
      insights: insights || {
        total_orders: 0,
        total_spent: 0,
        average_order_value: 0,
        completed_orders: 0,
        disputed_orders: 0,
        rejected_orders: 0,
        orders_last_30_days: 0,
        orders_last_90_days: 0,
        days_since_last_order: null,
        last_order_date: null
      },
      lifetime_value: lifetimeValue || {
        total_revenue: 0,
        order_count: 0,
        avg_order_value: 0,
        first_order_date: null,
        last_order_date: null,
        customer_tenure_days: 0
      },
      purchase_frequency: purchaseFrequency || [],
      category_preferences: categoryPreferences || [],
      recent_orders: recentOrders || [],
      delivery_addresses: uniqueAddresses.slice(0, 3), // Top 3 addresses
      // Calculate additional metrics
      retention_score: calculateRetentionScore(insights),
      customer_segment: determineCustomerSegment(insights)
    }

    return NextResponse.json({ contractor: profile })
  } catch (error: any) {
    console.error('Get contractor profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contractor profile' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateRetentionScore(insights: any): number {
  if (!insights) return 0

  let score = 0

  // Frequency score (0-40 points)
  if (insights.orders_last_30_days >= 5) score += 40
  else if (insights.orders_last_30_days >= 3) score += 30
  else if (insights.orders_last_30_days >= 1) score += 20
  else if (insights.orders_last_90_days >= 3) score += 10

  // Value score (0-30 points)
  if (insights.average_order_value >= 200) score += 30
  else if (insights.average_order_value >= 100) score += 20
  else if (insights.average_order_value >= 50) score += 10

  // Loyalty score (0-30 points)
  if (insights.total_orders >= 20) score += 30
  else if (insights.total_orders >= 10) score += 20
  else if (insights.total_orders >= 5) score += 10

  return score
}

function determineCustomerSegment(insights: any): string {
  if (!insights) return 'new'

  const { total_orders, average_order_value, orders_last_30_days } = insights

  // VIP: High value, high frequency
  if (total_orders >= 10 && average_order_value >= 150 && orders_last_30_days >= 2) {
    return 'vip'
  }

  // Loyal: Regular orders
  if (total_orders >= 5 && orders_last_30_days >= 1) {
    return 'loyal'
  }

  // At Risk: Was active but declining
  if (total_orders >= 5 && orders_last_30_days === 0 && insights.days_since_last_order > 60) {
    return 'at_risk'
  }

  // Occasional: Low frequency
  if (total_orders >= 2) {
    return 'occasional'
  }

  // New: Just starting
  return 'new'
}