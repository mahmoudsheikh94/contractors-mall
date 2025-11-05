import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/supplier/tags/[tagId]
 *
 * Updates a tag
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tagId: string } }
) {
  try {
    const supabase = await createClient()
    const { tagId } = params
    const body = await request.json()
    const { name, color } = body

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Verify tag belongs to supplier
    const { data: tag } = await supabase
      .from('order_tags')
      .select('id, supplier_id')
      .eq('id', tagId)
      .single()

    if (!tag || tag.supplier_id !== supplier.id) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, any> = {}
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim()
    }
    if (color !== undefined) {
      updateData.color = color
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update tag
    const { data: updatedTag, error: updateError } = await supabase
      .from('order_tags')
      .update(updateData)
      .eq('id', tagId)
      .select()
      .single()

    if (updateError) {
      console.error('Tag update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tag: updatedTag,
      message: 'تم تحديث التصنيف بنجاح',
    })
  } catch (error: any) {
    console.error('Update tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/supplier/tags/[tagId]
 *
 * Deletes a tag
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tagId: string } }
) {
  try {
    const supabase = await createClient()
    const { tagId } = params

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Verify tag belongs to supplier
    const { data: tag } = await supabase
      .from('order_tags')
      .select('id, supplier_id')
      .eq('id', tagId)
      .single()

    if (!tag || tag.supplier_id !== supplier.id) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Delete tag (assignments will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('order_tags')
      .delete()
      .eq('id', tagId)

    if (deleteError) {
      console.error('Tag delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف التصنيف بنجاح',
    })
  } catch (error: any) {
    console.error('Delete tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
