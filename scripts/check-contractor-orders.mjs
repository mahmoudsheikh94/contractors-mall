import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3Nzc0NSwiZXhwIjoyMDc2MjUzNzQ1fQ.pzlUjpU53N2RVYME1UEStsetc6KcD7BIh33H73BnOU4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkContractorOrders() {
  // Get contractor profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', 'contractor1@test.jo')
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    return
  }

  console.log('\n📋 Contractor Profile:')
  console.log('--------------------')
  console.log('ID:', profile.id)
  console.log('Email:', profile.email)
  console.log('Name:', profile.full_name)
  console.log('Role:', profile.role)

  // Get orders for this contractor
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_jod,
      created_at,
      supplier_id,
      suppliers (
        business_name
      )
    `)
    .eq('contractor_id', profile.id)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('Error fetching orders:', ordersError)
    return
  }

  console.log('\n📦 Orders:')
  console.log('--------------------')
  console.log('Total orders:', orders?.length || 0)

  if (orders && orders.length > 0) {
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order #${order.order_number}`)
      console.log(`   Status: ${order.status}`)
      console.log(`   Total: ${order.total_jod} JOD`)
      console.log(`   Supplier: ${order.suppliers?.business_name || 'Unknown'}`)
      console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`)
    })
  } else {
    console.log('No orders found for this contractor.')
  }
}

checkContractorOrders()
