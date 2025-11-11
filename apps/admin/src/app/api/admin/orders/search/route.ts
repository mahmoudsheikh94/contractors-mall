import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError } from '@/lib/monitoring'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders/search
 *
 * Advanced search for orders with full-text search support
 * Supports Arabic and English search terms
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
    const searchQuery = url.searchParams.get('q')
    const status = url.searchParams.getAll('status') // Support multiple statuses
    const paymentStatus = url.searchParams.getAll('paymentStatus')
    const supplierId = url.searchParams.get('supplierId')
    const contractorId = url.searchParams.get('contractorId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const minAmount = url.searchParams.get('minAmount')
    const maxAmount = url.searchParams.get('maxAmount')
    const vehicleType = url.searchParams.get('vehicleType')
    const deliveryZone = url.searchParams.get('deliveryZone')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build base query with joins
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        created_at,
        delivery_date,
        delivery_time_slot,
        total_jod,
        delivery_fee_jod,
        delivery_address,
        delivery_zone,
        delivery_phone,
        special_requests,
        vehicle_type,
        contractor:contractor_id (
          id,
          full_name,
          phone,
          email
        ),
        supplier:supplier_id (
          id,
          business_name,
          business_name_en,
          phone
        )
      `, { count: 'exact' })

    // Apply full-text search if query provided
    if (searchQuery && searchQuery.trim()) {
      // Use textSearch for full-text search on indexed columns
      // This searches order_number, delivery_address, delivery_phone, special_requests
      query = query.textSearch('fts_document', searchQuery.trim(), {
        type: 'websearch',
        config: 'english' // Will also match Arabic due to our dual indexes
      })
    }

    // Apply filters
    if (status.length > 0) {
      query = query.in('status', status as any)
    }

    // Note: payment_status doesn't exist on orders table
    // Payment status is tracked in the payments table
    // Commenting out until proper join with payments table is implemented
    // if (paymentStatus.length > 0) {
    //   query = query.in('payment_status', paymentStatus)
    // }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    if (contractorId) {
      query = query.eq('contractor_id', contractorId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (minAmount) {
      query = query.gte('total_jod', parseFloat(minAmount))
    }

    if (maxAmount) {
      query = query.lte('total_jod', parseFloat(maxAmount))
    }

    if (vehicleType) {
      query = query.eq('vehicle_type', vehicleType)
    }

    if (deliveryZone) {
      query = query.eq('delivery_zone', deliveryZone as any)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: orders, error: ordersError, count } = await query

    if (ordersError) {
      trackAPIError(
        new Error(ordersError.message),
        '/api/admin/orders/search',
        'GET',
        500,
        { searchQuery, filters: { status, supplierId, contractorId } }
      )
      return NextResponse.json(
        { error: 'Failed to search orders' },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        searchQuery,
        status,
        paymentStatus,
        supplierId,
        contractorId,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        vehicleType,
        deliveryZone,
      }
    })
  } catch (error: any) {
    console.error('Search orders error:', error)
    trackAPIError(
      error,
      '/api/admin/orders/search',
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to search orders' },
      { status: 500 }
    )
  }
}
