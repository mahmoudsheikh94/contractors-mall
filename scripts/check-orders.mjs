#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkOrders() {
  console.log('🔍 Checking orders in database...\n')

  // Get all orders with related data
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      total_jod,
      contractor_id,
      supplier_id,
      profiles!contractor_id(email, full_name, role),
      suppliers(business_name, email)
    `)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('Error fetching orders:', ordersError)
    return
  }

  console.log(`📦 Total Orders: ${orders?.length || 0}\n`)

  if (!orders || orders.length === 0) {
    console.log('❌ No orders found in database')
    return
  }

  // Group orders by contractor
  const contractorOrders = {}
  orders.forEach(order => {
    const contractorId = order.contractor_id
    if (!contractorOrders[contractorId]) {
      contractorOrders[contractorId] = {
        profile: order.profiles,
        orders: []
      }
    }
    contractorOrders[contractorId].orders.push(order)
  })

  // Group orders by supplier
  const supplierOrders = {}
  orders.forEach(order => {
    const supplierId = order.supplier_id
    if (!supplierOrders[supplierId]) {
      supplierOrders[supplierId] = {
        supplier: order.suppliers,
        orders: []
      }
    }
    supplierOrders[supplierId].orders.push(order)
  })

  console.log('👷 CONTRACTORS WITH ORDERS:')
  console.log('=' .repeat(60))
  Object.entries(contractorOrders).forEach(([contractorId, data]) => {
    console.log(`\n📧 Email: ${data.profile?.email}`)
    console.log(`👤 Name: ${data.profile?.full_name}`)
    console.log(`🔑 Password: Test123456!`)
    console.log(`📊 Orders: ${data.orders.length}`)
    console.log(`   Status breakdown:`)
    const statusCount = {}
    data.orders.forEach(o => {
      statusCount[o.status] = (statusCount[o.status] || 0) + 1
    })
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
  })

  console.log('\n\n🏢 SUPPLIERS WITH ORDERS:')
  console.log('=' .repeat(60))
  Object.entries(supplierOrders).forEach(([supplierId, data]) => {
    console.log(`\n📧 Email: ${data.supplier?.email}`)
    console.log(`🏪 Business: ${data.supplier?.business_name}`)
    console.log(`🔑 Password: Test123456!`)
    console.log(`📊 Orders: ${data.orders.length}`)
    console.log(`   Status breakdown:`)
    const statusCount = {}
    data.orders.forEach(o => {
      statusCount[o.status] = (statusCount[o.status] || 0) + 1
    })
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
  })

  console.log('\n\n📋 ORDER DETAILS:')
  console.log('=' .repeat(60))
  orders.forEach(order => {
    console.log(`\n${order.order_number} - ${order.status.toUpperCase()}`)
    console.log(`  💰 Total: ${order.total_jod} JOD`)
    console.log(`  👷 Contractor: ${order.profiles?.email}`)
    console.log(`  🏪 Supplier: ${order.suppliers?.business_name}`)
  })
}

checkOrders().catch(console.error)
