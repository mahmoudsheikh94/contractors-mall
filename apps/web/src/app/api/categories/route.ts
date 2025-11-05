import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all active categories with parent-child relationships
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // Organize into hierarchical structure
    const rootCategories = categories?.filter((cat: any) => !cat.parent_id) || []
    const childCategories = categories?.filter((cat: any) => cat.parent_id) || []

    const hierarchical = rootCategories.map((parent: any) => ({
      ...parent,
      children: childCategories.filter((child: any) => child.parent_id === parent.id),
    }))

    return NextResponse.json({
      categories: hierarchical,
      flat: categories,
      count: categories?.length || 0,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
