import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSupplierOrders() {
  const supplierEmail = 'mdsalard94+Jilvar@gmail.com'
  
  console.log('1. Finding supplier profile...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('email', supplierEmail)
    .single()
  
  if (profileError || !profile) {
    console.error('Profile not found:', profileError)
    return
  }
  
  console.log('Profile found:', profile)
  
  console.log('\n2. Finding supplier record...')
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, business_name, owner_id')
    .eq('owner_id', profile.id)
    .single()
  
  if (supplierError || !supplier) {
    console.error('Supplier not found:', supplierError)
    return
  }
  
  console.log('Supplier found:', supplier)
  
  console.log('\n3. Checking orders for supplier...')
  const { data: orders, error: ordersError, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('supplier_id', supplier.id)
  
  console.log('Orders count:', count)
  console.log('Orders error:', ordersError)
  console.log('Sample orders:', orders?.slice(0, 2))
  
  console.log('\n4. Testing the exact query from the page...')
  const { data: ordersWithJoin, error: joinError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_jod,
      delivery_fee_jod,
      created_at,
      scheduled_delivery_date,
      scheduled_delivery_time,
      delivery_address,
      contractor_id,
      profiles!contractor_id (
        full_name,
        phone
      )
    `, { count: 'exact' })
    .eq('supplier_id', supplier.id)
    .limit(5)
  
  console.log('Join query error:', joinError)
  console.log('Join query count:', ordersWithJoin?.length)
  console.log('Sample order with join:', ordersWithJoin?.[0])
  
  console.log('\n5. Checking RLS policies...')
  const { data: policies } = await supabase
    .rpc('pg_policies')
    .eq('tablename', 'orders')
  
  console.log('RLS policies:', policies)
}

testSupplierOrders()
