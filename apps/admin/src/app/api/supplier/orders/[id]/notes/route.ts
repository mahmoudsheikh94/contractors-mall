import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/orders/[id]/notes
 *
 * Fetches notes for an order
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

    // Verify supplier ownership
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

    // Fetch notes with creator info
    const { data: notes, error: notesError } = await supabase
      .from('order_notes')
      .select(`
        id,
        note,
        is_internal,
        created_at,
        updated_at,
        created_by,
        creator:created_by (
          id,
          full_name
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Notes fetch error:', notesError)
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (error: any) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/supplier/orders/[id]/notes
 *
 * Creates a new note for an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const body = await request.json()
    const { note, isInternal = true } = body

    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify supplier ownership
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

    // Create note
    const { data: newNote, error: insertError } = await (supabase
      .from('order_notes')
      .insert as any)({
        order_id: orderId,
        note: note.trim(),
        is_internal: isInternal,
        created_by: user.id,
      })
      .select(`
        id,
        note,
        is_internal,
        created_at,
        updated_at,
        created_by,
        creator:created_by (
          id,
          full_name
        )
      `)
      .single()

    if (insertError) {
      console.error('Note insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      note: newNote,
      message: 'تمت إضافة الملاحظة بنجاح',
    })
  } catch (error: any) {
    console.error('Create note error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    )
  }
}
