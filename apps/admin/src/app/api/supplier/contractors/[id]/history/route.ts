import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/contractors/[id]/history
 *
 * Get contractor's order history with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const contractorId = params.id
    const { searchParams } = new URL(request.url)

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Filters
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier info
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_jod,
        status,
        created_at,
        delivery_date,
        delivery_time_slot,
        delivery_address,
        payment_status,
        order_items (
          item_id,
          product_name,
          quantity,
          unit_price_jod,
          total_jod
        )
      `, { count: 'exact' })
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplier.id)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: orders, error: ordersError, count } = await query

    if (ordersError) {
      console.error('Orders fetch error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch order history' },
        { status: 500 }
      )
    }

    // Calculate statistics for the filtered period
    let statsQuery = supabase
      .from('orders')
      .select('total_jod, status')
      .eq('contractor_id', contractorId)
      .eq('supplier_id', supplier.id)

    if (status) {
      statsQuery = statsQuery.eq('status', status)
    }
    if (startDate) {
      statsQuery = statsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      statsQuery = statsQuery.lte('created_at', endDate)
    }

    const { data: statsData } = await statsQuery

    const statistics = {
      total_orders: statsData?.length || 0,
      total_spent: statsData?.reduce((sum, order) => sum + order.total_jod, 0) || 0,
      average_order_value: statsData?.length ?
        (statsData.reduce((sum, order) => sum + order.total_jod, 0) / statsData.length) : 0,
      status_breakdown: statsData?.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {})
    }

    return NextResponse.json({
      orders: orders as any || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      statistics
    })
  } catch (error: any) {
    console.error('Get contractor history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order history' },
      { status: 500 }
    )
  }
}