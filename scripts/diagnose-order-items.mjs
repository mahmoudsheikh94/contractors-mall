/**
 * Diagnostic script to check order items structure
 * Usage: node scripts/diagnose-order-items.mjs <orderId>
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzc3NDUsImV4cCI6MjA3NjI1Mzc0NX0.YNs2X__Z6IZ1wBc6CH1ivRzGBPwAbch8e7qjBj5enbs'

const orderId = process.argv[2] || 'c01618c4-5394-4cde-b5f5-52ca2f8d403a'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Diagnosing order:', orderId)
console.log('')

// Get order with items
const { data: orders, error: orderError } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)

if (orderError) {
  console.error('❌ Error fetching order:', orderError)
  process.exit(1)
}

if (!orders || orders.length === 0) {
  console.error('❌ Order not found or no access (RLS policy blocking)')
  console.log('This might be due to RLS policies. The anon key might not have access.')
  process.exit(1)
}

const order = orders[0]

console.log('📦 Order found:', {
  id: order.id,
  order_number: order.order_number,
  status: order.status,
  total_jod: order.total_jod,
  supplier_id: order.supplier_id,
  contractor_id: order.contractor_id
})
console.log('')

// Get order items
const { data: items, error: itemsError } = await supabase
  .from('order_items')
  .select('*')
  .eq('order_id', orderId)

if (itemsError) {
  console.error('❌ Error fetching order items:', itemsError)
  process.exit(1)
}

console.log(`📋 Found ${items.length} order items:`)
console.log('')

items.forEach((item, index) => {
  console.log(`Item ${index + 1}:`)
  console.log(`  item_id: ${item.item_id}`)
  console.log(`  product_id: ${item.product_id}`)
  console.log(`  quantity: ${item.quantity}`)
  console.log(`  unit_price_jod: ${item.unit_price_jod} (type: ${typeof item.unit_price_jod})`)
  console.log(`  total_jod: ${item.total_jod}`)
  console.log(`  All fields:`, Object.keys(item))
  console.log('')
})

// Check if the query that the generator uses works
console.log('🔬 Testing generator query...')
const { data: testOrder, error: testError } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      item_id,
      product_id,
      quantity,
      unit_price_jod,
      total_jod,
      product:products (
        id,
        name_ar,
        name_en,
        sku,
        category_id
      )
    ),
    supplier:suppliers (
      id,
      business_name,
      business_name_en,
      phone,
      address,
      city,
      tax_number
    ),
    contractor:profiles (
      id,
      full_name,
      phone,
      email
    )
  `)
  .eq('id', orderId)
  .single()

if (testError) {
  console.error('❌ Generator query error:', testError)
  process.exit(1)
}

console.log('✅ Generator query successful!')
console.log('Order items from generator query:')
testOrder.order_items.forEach((item, index) => {
  console.log(`  Item ${index + 1}:`)
  console.log(`    unit_price_jod: ${item.unit_price_jod} (type: ${typeof item.unit_price_jod})`)
  console.log(`    quantity: ${item.quantity}`)
  console.log(`    product: ${item.product?.name_ar || 'N/A'}`)
})
