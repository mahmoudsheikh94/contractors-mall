import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const supplierId = searchParams.get('supplierId')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        supplier:suppliers (
          id,
          business_name,
          business_name_en,
          rating_average,
          latitude,
          longitude,
          is_verified
        ),
        category:categories (
          id,
          name_ar,
          name_en,
          slug,
          parent_id
        )
      `)
      .eq('is_available', true)
      .order('name_ar', { ascending: true })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    // Filter by supplier if provided
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    // Filter by category if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    // Apply text search if provided
    if (search) {
      query = query.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%,description_ar.ilike.%${search}%,description_en.ilike.%${search}%`)
    }

    // Also filter for verified suppliers only
    const { data: products, error, count } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Filter out products from unverified suppliers
    const verifiedProducts = products?.filter((product: any) =>
      product.supplier?.is_verified === true
    ) || []

    return NextResponse.json({
      products: verifiedProducts,
      count: verifiedProducts.length,
      total: count || 0,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
