import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/tags
 *
 * Fetches all tags for the current supplier
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // Fetch tags for this supplier
    const { data: tags, error: tagsError } = await supabase
      .from('order_tags')
      .select('*')
      .eq('supplier_id', supplier.id)
      .order('name', { ascending: true })

    if (tagsError) {
      console.error('Tags fetch error:', tagsError)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tags: tags || [] })
  } catch (error: any) {
    console.error('Get tags error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/supplier/tags
 *
 * Creates a new tag
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { name, color = '#3B82F6' } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

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

    // Check if tag with same name exists
    const { data: existingTag } = await supabase
      .from('order_tags')
      .select('id')
      .eq('supplier_id', supplier.id)
      .eq('name', name.trim())
      .maybeSingle()

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      )
    }

    // Create tag
    const { data: newTag, error: insertError } = await (supabase
      .from('order_tags')
      .insert as any)({
        supplier_id: supplier.id,
        name: name.trim(),
        color: color,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Tag insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tag: newTag,
      message: 'تم إنشاء التصنيف بنجاح',
    })
  } catch (error: any) {
    console.error('Create tag error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tag' },
      { status: 500 }
    )
  }
}
