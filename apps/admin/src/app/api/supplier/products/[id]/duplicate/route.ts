import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/supplier/products/[id]/duplicate
 *
 * Duplicates a product with smart SKU naming
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const productId = params.id

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the original product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify supplier ownership
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', product.supplier_id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate smart SKU
    const baseSku = product.sku
    let newSku = `${baseSku}-COPY`
    let attempt = 1
    let skuExists = true

    // Keep trying SKUs until we find one that doesn't exist
    while (skuExists && attempt <= 100) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_id', product.supplier_id)
        .eq('sku', newSku)
        .maybeSingle()

      if (!existing) {
        skuExists = false
      } else {
        attempt++
        newSku = `${baseSku}-COPY-${attempt}`
      }
    }

    if (skuExists) {
      return NextResponse.json(
        { error: 'Could not generate unique SKU after 100 attempts' },
        { status: 500 }
      )
    }

    // Create duplicate product (exclude id, created_at, updated_at)
    const duplicateProduct = {
      sku: newSku,
      name_ar: `${product.name_ar} (نسخة)`,
      name_en: product.name_en ? `${product.name_en} (Copy)` : null,
      description_ar: product.description_ar,
      description_en: product.description_en,
      category_id: product.category_id,
      unit_ar: product.unit_ar,
      unit_en: product.unit_en,
      price_per_unit: product.price_per_unit,
      min_order_quantity: product.min_order_quantity,
      stock_quantity: product.stock_quantity,
      weight_kg_per_unit: product.weight_kg_per_unit,
      volume_m3_per_unit: product.volume_m3_per_unit,
      length_m_per_unit: product.length_m_per_unit,
      requires_open_bed: product.requires_open_bed,
      is_available: false, // Set as unavailable by default for review
      supplier_id: product.supplier_id,
    }

    const { data: newProduct, error: insertError } = await (supabase
      .from('products')
      .insert as any)(duplicateProduct)
      .select()
      .single()

    if (insertError) {
      console.error('Duplicate insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to duplicate product' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: `تم إنشاء نسخة بنجاح: ${newSku}`,
    })
  } catch (error: any) {
    console.error('Duplicate error:', error)
    return NextResponse.json(
      { error: error.message || 'Duplication failed' },
      { status: 500 }
    )
  }
}
