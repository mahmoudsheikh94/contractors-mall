import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/communications
 *
 * Get communication logs for the supplier
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Query params
    const contractorId = searchParams.get('contractorId')
    const orderId = searchParams.get('orderId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

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
    let query = (supabase as any)
      .from('contractor_communications')
      .select(`
        *,
        contractor:contractor_id (
          id,
          full_name,
          email,
          phone
        ),
        order:order_id (
          id,
          order_number
        ),
        creator:created_by (
          id,
          full_name
        )
      `, { count: 'exact' })
      .eq('supplier_id', supplier.id)

    // Apply filters
    if (contractorId) {
      query = query.eq('contractor_id', contractorId)
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    if (type) {
      query = query.eq('type', type)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: communications, error: commsError, count } = await query

    if (commsError) {
      console.error('Communications fetch error:', commsError)
      return NextResponse.json(
        { error: 'Failed to fetch communications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      communications: (communications || []) as any,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Get communications error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/supplier/communications
 *
 * Create a new communication log entry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { contractor_id, order_id, type, subject, message, metadata } = body

    // Validate required fields
    if (!contractor_id || !type || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['order_inquiry', 'complaint', 'feedback', 'general', 'dispute']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid communication type' },
        { status: 400 }
      )
    }

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

    // Verify contractor exists
    const { data: contractor } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', contractor_id)
      .eq('role', 'contractor')
      .single()

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    // If order_id provided, verify it belongs to the supplier and contractor
    if (order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('id', order_id)
        .eq('supplier_id', supplier.id)
        .eq('contractor_id', contractor_id)
        .single()

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found or does not belong to this supplier/contractor' },
          { status: 404 }
        )
      }
    }

    // Create communication log
    const { data: communication, error: insertError } = await (supabase as any)
      .from('contractor_communications')
      .insert({
        contractor_id,
        supplier_id: supplier.id,
        order_id: order_id || null,
        type,
        subject,
        message,
        metadata: metadata || {},
        created_by: user.id
      })
      .select(`
        *,
        contractor:contractor_id (
          id,
          full_name,
          email,
          phone
        ),
        order:order_id (
          id,
          order_number
        ),
        creator:created_by (
          id,
          full_name
        )
      `)
      .single()

    if (insertError) {
      console.error('Communication insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create communication log' },
        { status: 500 }
      )
    }

    // Create notification for relevant parties if needed
    if (type === 'complaint' || type === 'dispute') {
      await (supabase
        .from('in_app_notifications')
        .insert as any)({
        user_id: contractor_id,
        type: 'communication_logged',
        title: 'تم تسجيل اتصال جديد',
        message: `${subject}`,
        data: {
          communication_id: communication.id,
          type,
          supplier_id: supplier.id
        }
      })
    }

    return NextResponse.json({
      success: true,
      communication,
      message: 'تم تسجيل الاتصال بنجاح'
    })
  } catch (error: any) {
    console.error('Create communication error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create communication log' },
      { status: 500 }
    )
  }
}