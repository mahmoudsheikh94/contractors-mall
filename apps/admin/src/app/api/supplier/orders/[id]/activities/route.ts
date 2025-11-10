import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/orders/[id]/activities
 *
 * Fetches the activity timeline for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify supplier ownership of the order
    const { data: order } = await supabase
      .from('orders')
      .select('id, supplier_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', order.supplier_id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch activities with creator info
    const { data: activities, error: activitiesError} = await supabase
      .from('order_activities')
      .select(`
        id,
        activity_type,
        description,
        metadata,
        created_at,
        created_by,
        creator:created_by (
          id,
          full_name
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (activitiesError) {
      console.error('Activities fetch error:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (error: any) {
    console.error('Get activities error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
