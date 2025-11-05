import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/supplier/products/bulk-update
 *
 * Updates multiple products at once with various operations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { supplierId, productIds, updates } = body

    if (!supplierId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Supplier ID and product IDs are required' },
        { status: 400 }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'At least one update field is required' },
        { status: 400 }
      )
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

    // Verify all products belong to this supplier
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, price_per_unit, stock_quantity')
      .eq('supplier_id', supplierId)
      .in('id', productIds)

    if (!existingProducts || existingProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products not found or do not belong to this supplier' },
        { status: 404 }
      )
    }

    // Process each product update individually to handle price/stock calculations
    let updatedCount = 0
    const errors: any[] = []

    for (const product of existingProducts) {
      try {
        const productUpdate: any = {}

        // Handle price updates
        if (updates.price) {
          const { action, value } = updates.price
          let newPrice = product.price_per_unit

          switch (action) {
            case 'increase_percent':
              newPrice = product.price_per_unit * (1 + value / 100)
              break
            case 'decrease_percent':
              newPrice = product.price_per_unit * (1 - value / 100)
              break
            case 'set_fixed':
              newPrice = value
              break
          }

          if (newPrice <= 0) {
            errors.push({ productId: product.id, error: 'Price cannot be zero or negative' })
            continue
          }

          productUpdate.price_per_unit = Math.round(newPrice * 100) / 100 // Round to 2 decimals
        }

        // Handle stock updates
        if (updates.stock) {
          const { action, value } = updates.stock
          let newStock = product.stock_quantity || 0

          switch (action) {
            case 'set':
              newStock = value
              break
            case 'add':
              newStock = (product.stock_quantity || 0) + value
              break
            case 'subtract':
              newStock = (product.stock_quantity || 0) - value
              break
          }

          if (newStock < 0) {
            errors.push({ productId: product.id, error: 'Stock cannot be negative' })
            continue
          }

          productUpdate.stock_quantity = newStock
        }

        // Handle availability updates
        if (updates.availability !== undefined) {
          productUpdate.is_available = updates.availability
        }

        // Handle min order quantity updates
        if (updates.min_order_quantity !== undefined) {
          if (updates.min_order_quantity < 1) {
            errors.push({ productId: product.id, error: 'Min order quantity must be at least 1' })
            continue
          }
          productUpdate.min_order_quantity = updates.min_order_quantity
        }

        // Apply update
        const { error: updateError } = await (supabase
          .from('products')
          .update as any)(productUpdate)
          .eq('id', product.id)

        if (updateError) {
          errors.push({ productId: product.id, error: updateError.message })
        } else {
          updatedCount++
        }
      } catch (error: any) {
        errors.push({ productId: product.id, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: productIds.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Bulk update error:', error)
    return NextResponse.json(
      { error: error.message || 'Bulk update failed' },
      { status: 500 }
    )
  }
}
