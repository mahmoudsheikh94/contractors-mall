import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3Nzc0NSwiZXhwIjoyMDc2MjUzNzQ1fQ.pzlUjpU53N2RVYME1UEStsetc6KcD7BIh33H73BnOU4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSupplierOrders() {
  // Get all suppliers
  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .select('id, business_name, owner_id')
    .order('business_name')

  if (suppliersError) {
    console.error('Error fetching suppliers:', suppliersError)
    return
  }

  console.log(`\n📊 Found ${suppliers.length} suppliers\n`)
  console.log('='.repeat(80))

  for (const supplier of suppliers) {
    console.log(`\n🏢 ${supplier.business_name}`)
    console.log('─'.repeat(80))

    // Get orders by status
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, total_jod, created_at, scheduled_delivery_date')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      continue
    }

    console.log(`Total orders: ${orders?.length || 0}`)

    if (orders && orders.length > 0) {
      // Group by status
      const statusGroups = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {})

      console.log('\n📦 Orders by Status:')
      Object.entries(statusGroups)
        .sort(([, a], [, b]) => b - a)
        .forEach(([status, count]) => {
          console.log(`   ${status.padEnd(35)}: ${count}`)
        })

      // Show today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      console.log(`\n📅 Today's date: ${todayStr}`)

      // Count orders created today
      const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at)
        orderDate.setHours(0, 0, 0, 0)
        return orderDate.toISOString().split('T')[0] === todayStr
      })
      console.log(`   Orders created today: ${todayOrders.length}`)

      // Count orders scheduled for today
      const scheduledToday = orders.filter(o =>
        o.scheduled_delivery_date === todayStr
      )
      console.log(`   Orders scheduled for delivery today: ${scheduledToday.length}`)

      // Count "active" orders (not completed, not cancelled, not rejected)
      const activeStatuses = ['pending', 'confirmed', 'accepted', 'in_delivery', 'awaiting_contractor_confirmation', 'delivered']
      const activeOrders = orders.filter(o => activeStatuses.includes(o.status))
      console.log(`   Active orders (pending to delivered): ${activeOrders.length}`)

      // Show recent orders
      console.log('\n📋 Recent Orders:')
      orders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.order_number} - ${order.status.padEnd(20)} - ${order.total_jod} JOD - ${new Date(order.created_at).toLocaleDateString()}`)
      })
    } else {
      console.log('   No orders found')
    }
  }

  console.log('\n' + '='.repeat(80))
}

checkSupplierOrders()
