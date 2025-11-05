import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/products/export
 *
 * Exports all products for a supplier as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID required' }, { status: 400 })
    }

    // Get current user and verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify supplier ownership
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', supplierId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch all products for this supplier
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name_ar, name_en)
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('Products fetch error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Convert to CSV
    const headers = [
      'id',
      'sku',
      'name_ar',
      'name_en',
      'description_ar',
      'description_en',
      'category_id',
      'category_name_ar',
      'unit_ar',
      'unit_en',
      'price_per_unit',
      'min_order_quantity',
      'stock_quantity',
      'weight_kg_per_unit',
      'volume_m3_per_unit',
      'length_m_per_unit',
      'requires_open_bed',
      'is_available',
      'created_at',
    ]

    const csvRows = [headers.join(',')]

    products?.forEach((product: any) => {
      const row = [
        product.id || '',
        product.sku || '',
        `"${(product.name_ar || '').replace(/"/g, '""')}"`,
        `"${(product.name_en || '').replace(/"/g, '""')}"`,
        `"${(product.description_ar || '').replace(/"/g, '""')}"`,
        `"${(product.description_en || '').replace(/"/g, '""')}"`,
        product.category_id || '',
        `"${(product.category?.name_ar || '').replace(/"/g, '""')}"`,
        product.unit_ar || '',
        product.unit_en || '',
        product.price_per_unit || '',
        product.min_order_quantity || '',
        product.stock_quantity !== null ? product.stock_quantity : '',
        product.weight_kg_per_unit || '',
        product.volume_m3_per_unit || '',
        product.length_m_per_unit || '',
        product.requires_open_bed ? 'true' : 'false',
        product.is_available ? 'true' : 'false',
        product.created_at || '',
      ]
      csvRows.push(row.join(','))
    })

    const csv = csvRows.join('\n')

    // Add BOM for proper UTF-8 encoding in Excel
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="products-${supplierId}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
