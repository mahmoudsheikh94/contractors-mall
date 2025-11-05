import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/orders/[id]/tags
 *
 * Fetches tags assigned to an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify supplier ownership of order
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

    // Fetch tag assignments with tag details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('order_tag_assignments')
      .select(`
        id,
        assigned_at,
        tag:tag_id (
          id,
          name,
          color
        )
      `)
      .eq('order_id', orderId)

    if (assignmentsError) {
      console.error('Tag assignments fetch error:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tags: assignments || [] })
  } catch (error: any) {
    console.error('Get order tags error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/supplier/orders/[id]/tags
 *
 * Assigns a tag to an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify supplier ownership of order
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

    // Verify tag belongs to supplier
    const { data: tag } = await supabase
      .from('order_tags')
      .select('id, name, supplier_id')
      .eq('id', tagId)
      .single()

    if (!tag || tag.supplier_id !== supplier.id) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check if already assigned
    const { data: existingAssignment } = await supabase
      .from('order_tag_assignments')
      .select('id')
      .eq('order_id', orderId)
      .eq('tag_id', tagId)
      .maybeSingle()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Tag already assigned to this order' },
        { status: 409 }
      )
    }

    // Assign tag
    const { data: assignment, error: insertError } = await (supabase
      .from('order_tag_assignments')
      .insert as any)({
        order_id: orderId,
        tag_id: tagId,
        assigned_by: user.id,
      })
      .select(`
        id,
        assigned_at,
        tag:tag_id (
          id,
          name,
          color
        )
      `)
      .single()

    if (insertError) {
      console.error('Tag assignment error:', insertError)
      return NextResponse.json(
        { error: 'Failed to assign tag' },
        { status: 500 }
      )
    }

    // Log activity
    await (supabase.from('order_activities').insert as any)({
      order_id: orderId,
      activity_type: 'tag_added',
      description: `أضاف تصنيف: ${tag.name}`,
      created_by: user.id,
      metadata: {
        tag_id: tagId,
        tag_name: tag.name,
      },
    })

    return NextResponse.json({
      success: true,
      assignment,
      message: 'تم إضافة التصنيف بنجاح',
    })
  } catch (error: any) {
    console.error('Assign tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/supplier/orders/[id]/tags/[tagId]
 *
 * Removes a tag from an order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id
    const url = new URL(request.url)
    const tagId = url.searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
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

    // Get tag name for activity log
    const { data: tag } = await supabase
      .from('order_tags')
      .select('name')
      .eq('id', tagId)
      .single()

    // Delete assignment
    const { error: deleteError } = await supabase
      .from('order_tag_assignments')
      .delete()
      .eq('order_id', orderId)
      .eq('tag_id', tagId)

    if (deleteError) {
      console.error('Tag removal error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove tag' },
        { status: 500 }
      )
    }

    // Log activity
    if (tag) {
      await (supabase.from('order_activities').insert as any)({
        order_id: orderId,
        activity_type: 'tag_removed',
        description: `أزال تصنيف: ${tag.name}`,
        created_by: user.id,
        metadata: {
          tag_id: tagId,
          tag_name: tag.name,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'تم إزالة التصنيف بنجاح',
    })
  } catch (error: any) {
    console.error('Remove tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove tag' },
      { status: 500 }
    )
  }
}
