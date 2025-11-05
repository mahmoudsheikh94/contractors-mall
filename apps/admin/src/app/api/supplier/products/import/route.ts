import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/supplier/products/import
 *
 * Imports products from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplierId = formData.get('supplierId') as string

    if (!file || !supplierId) {
      return NextResponse.json({ error: 'File and supplier ID required' }, { status: 400 })
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

    // Read CSV file
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1)

    const products: any[] = []
    const errors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        // Simple CSV parser (handles quoted fields)
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (let char of rows[i]) {
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''))
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''))

        // Map values to headers
        const product: any = {}
        headers.forEach((header, index) => {
          product[header] = values[index] || null
        })

        // Validate required fields
        if (!product.sku || !product.name_ar || !product.price_per_unit) {
          errors.push({ row: i + 2, error: 'Missing required fields (sku, name_ar, price_per_unit)' })
          continue
        }

        // Parse numeric fields
        const parsedProduct = {
          sku: product.sku,
          name_ar: product.name_ar,
          name_en: product.name_en || product.name_ar,
          description_ar: product.description_ar || '',
          description_en: product.description_en || '',
          category_id: product.category_id,
          unit_ar: product.unit_ar || 'وحدة',
          unit_en: product.unit_en || 'unit',
          price_per_unit: parseFloat(product.price_per_unit),
          min_order_quantity: parseInt(product.min_order_quantity) || 1,
          stock_quantity: product.stock_quantity ? parseInt(product.stock_quantity) : null,
          weight_kg_per_unit: product.weight_kg_per_unit ? parseFloat(product.weight_kg_per_unit) : null,
          volume_m3_per_unit: product.volume_m3_per_unit ? parseFloat(product.volume_m3_per_unit) : null,
          length_m_per_unit: product.length_m_per_unit ? parseFloat(product.length_m_per_unit) : null,
          requires_open_bed: product.requires_open_bed === 'true' || product.requires_open_bed === '1',
          is_available: product.is_available !== 'false' && product.is_available !== '0',
          supplier_id: supplierId,
        }

        // Validate numbers
        if (isNaN(parsedProduct.price_per_unit) || parsedProduct.price_per_unit <= 0) {
          errors.push({ row: i + 2, error: 'Invalid price_per_unit' })
          continue
        }

        products.push(parsedProduct)
      } catch (error) {
        errors.push({ row: i + 2, error: 'Failed to parse row' })
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No valid products to import', errors },
        { status: 400 }
      )
    }

    // Check for existing SKUs
    const skus = products.map(p => p.sku)
    const { data: existing } = await supabase
      .from('products')
      .select('sku, id')
      .eq('supplier_id', supplierId)
      .in('sku', skus)

    const existingSkus = new Set(existing?.map(p => p.sku) || [])

    // Separate into new and update
    const newProducts = products.filter(p => !existingSkus.has(p.sku))
    const updateProducts = products.filter(p => existingSkus.has(p.sku))

    let imported = 0
    let updated = 0

    // Insert new products
    if (newProducts.length > 0) {
      const { data, error: insertError } = await (supabase
        .from('products')
        .insert as any)(newProducts)
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        errors.push({ error: `Failed to insert products: ${insertError.message}` })
      } else {
        imported = data?.length || 0
      }
    }

    // Update existing products
    for (const product of updateProducts) {
      const existingProduct = existing?.find(p => p.sku === product.sku)
      if (existingProduct) {
        const { error: updateError } = await (supabase
          .from('products')
          .update as any)(product)
          .eq('id', existingProduct.id)

        if (updateError) {
          errors.push({ sku: product.sku, error: `Failed to update: ${updateError.message}` })
        } else {
          updated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: imported + updated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    )
  }
}
