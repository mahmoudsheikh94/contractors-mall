import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/supplier/orders/[id]/notes/[noteId]
 *
 * Deletes a note from an order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const supabase = await createClient()
    const { id: orderId, noteId } = params

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the note belongs to the user
    const { data: note } = await supabase
      .from('order_notes')
      .select('id, created_by')
      .eq('id', noteId)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own notes' },
        { status: 403 }
      )
    }

    // Delete the note
    const { error: deleteError } = await supabase
      .from('order_notes')
      .delete()
      .eq('id', noteId)

    if (deleteError) {
      console.error('Note delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الملاحظة بنجاح',
    })
  } catch (error: any) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    )
  }
}
