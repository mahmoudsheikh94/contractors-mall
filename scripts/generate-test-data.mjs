#!/usr/bin/env node

/**
 * Generate comprehensive test data for Contractors Mall
 *
 * This script creates:
 * - Suppliers with products
 * - Contractors
 * - Orders in all statuses
 * - Payments in various states
 * - Deliveries scheduled for different dates
 * - Orders with amounts < 120 JOD and >= 120 JOD
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test data configuration
const TEST_SUPPLIERS = [
  {
    email: 'supplier1@contractors.jo',
    password: 'TestSupplier123!',
    business_name: 'مواد البناء الأردنية',
    business_name_en: 'Jordan Building Materials',
    phone: '+962791111111',
    zone_a_radius_km: 15,
    zone_b_radius_km: 30,
    latitude: 31.9566,
    longitude: 35.9450
  },
  {
    email: 'supplier2@contractors.jo',
    password: 'TestSupplier123!',
    business_name: 'المورد الذهبي',
    business_name_en: 'Golden Supplier',
    phone: '+962792222222',
    zone_a_radius_km: 20,
    zone_b_radius_km: 40,
    latitude: 31.9700,
    longitude: 35.9300
  },
  {
    email: 'supplier3@contractors.jo',
    password: 'TestSupplier123!',
    business_name: 'مستودع الإنشاءات',
    business_name_en: 'Construction Warehouse',
    phone: '+962793333333',
    zone_a_radius_km: 10,
    zone_b_radius_km: 25,
    latitude: 31.9500,
    longitude: 35.9600
  }
]

const TEST_CONTRACTORS = [
  {
    email: 'contractor1@test.jo',
    password: 'TestPassword123!',
    full_name: 'أحمد محمود',
    phone: '+962795555555'
  },
  {
    email: 'contractor2@test.jo',
    password: 'TestPassword123!',
    full_name: 'محمد علي',
    phone: '+962796666666'
  }
]

const PRODUCT_CATEGORIES = [
  { name: 'إسمنت', name_en: 'Cement', products: ['إسمنت أبيض', 'إسمنت رمادي', 'إسمنت مقاوم'] },
  { name: 'حديد', name_en: 'Steel', products: ['حديد تسليح 8 ملم', 'حديد تسليح 12 ملم', 'حديد تسليح 16 ملم'] },
  { name: 'رمل', name_en: 'Sand', products: ['رمل ناعم', 'رمل خشن', 'رمل أبيض'] },
  { name: 'طوب', name_en: 'Bricks', products: ['طوب أحمر', 'طوب أبيض', 'طوب مفرغ'] }
]

// Valid order statuses from the enum
const ORDER_STATUSES = [
  'pending',      // New order, not yet confirmed
  'confirmed',    // Confirmed, waiting supplier
  'in_delivery',  // Out for delivery
  'delivered',    // Delivered, awaiting payment release
  'completed',    // Payment released
  'cancelled'     // Cancelled
]

// Helper to generate dates
const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const daysFromNow = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0] // Just the date
}

// Helper to generate order number
const generateOrderNumber = () => {
  return `CM${Date.now()}${Math.floor(Math.random() * 1000)}`
}

async function createSupplier(supplierData) {
  console.log(`Creating supplier: ${supplierData.business_name}...`)

  // Try to create auth user, or get existing one
  let authUser
  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email: supplierData.email,
    password: supplierData.password,
    email_confirm: true,
    user_metadata: {
      role: 'supplier_admin',
      full_name: supplierData.business_name
    }
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      // User exists, fetch it
      console.log(`⚠️  User already exists, fetching: ${supplierData.email}`)
      const { data: { users } } = await supabase.auth.admin.listUsers()
      authUser = users.find(u => u.email === supplierData.email)

      if (!authUser) {
        console.error(`❌ Could not find existing user: ${supplierData.email}`)
        return null
      }
    } else {
      console.error(`❌ Failed to create supplier auth: ${authError.message}`)
      return null
    }
  } else {
    authUser = newUser.user
  }

  // Create profile (upsert to handle existing)
  await supabase
    .from('profiles')
    .upsert({
      id: authUser.id,
      role: 'supplier_admin',
      full_name: supplierData.business_name,
      phone: supplierData.phone,
      email_verified: true,
      phone_verified: false
    }, { onConflict: 'id' })

  // Check if supplier already exists
  const { data: existingSuppliers } = await supabase
    .from('suppliers')
    .select()
    .eq('owner_id', authUser.id)
    .limit(1)

  let supplier
  if (existingSuppliers && existingSuppliers.length > 0) {
    console.log(`⚠️  Supplier record already exists, using existing`)
    supplier = existingSuppliers[0]
  } else {
    // Create new supplier record
    const { data: newSupplier, error: supplierError} = await supabase
      .from('suppliers')
      .insert({
        owner_id: authUser.id,
        business_name: supplierData.business_name,
        business_name_en: supplierData.business_name_en,
        phone: supplierData.phone,
        email: supplierData.email,
        address: 'شارع الملك حسين، عمان',
        latitude: supplierData.latitude,
        longitude: supplierData.longitude,
        radius_km_zone_a: supplierData.zone_a_radius_km,
        radius_km_zone_b: supplierData.zone_b_radius_km,
        is_verified: true
      })
      .select()
      .single()

    if (supplierError) {
      console.error(`❌ Failed to create supplier record: ${supplierError.message}`)
      return null
    }
    supplier = newSupplier
  }

  if (!supplier) {
    console.error(`❌ No supplier record`)
    return null
  }

  console.log(`✅ Created supplier: ${supplier.business_name} (ID: ${supplier.id})`)
  return supplier
}

async function createContractor(contractorData) {
  console.log(`Creating contractor: ${contractorData.full_name}...`)

  // Try to create auth user, or get existing one
  let authUser
  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email: contractorData.email,
    password: contractorData.password,
    email_confirm: true,
    user_metadata: {
      role: 'contractor',
      full_name: contractorData.full_name
    }
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log(`⚠️  Contractor already exists, fetching: ${contractorData.email}`)
      const { data: { users } } = await supabase.auth.admin.listUsers()
      authUser = users.find(u => u.email === contractorData.email)

      if (!authUser) {
        console.error(`❌ Could not find existing contractor: ${contractorData.email}`)
        return null
      }
    } else {
      console.error(`❌ Failed to create contractor auth: ${authError.message}`)
      return null
    }
  } else {
    authUser = newUser.user
  }

  // Create profile (upsert to handle existing)
  await supabase
    .from('profiles')
    .upsert({
      id: authUser.id,
      role: 'contractor',
      full_name: contractorData.full_name,
      phone: contractorData.phone,
      email_verified: true,
      phone_verified: false
    }, { onConflict: 'id' })

  console.log(`✅ Created/fetched contractor: ${contractorData.full_name}`)
  return authUser
}

async function createProducts(supplierId, count = 12) {
  console.log(`Creating ${count} products for supplier ${supplierId}...`)

  const products = []
  let productIndex = 0

  for (const category of PRODUCT_CATEGORIES) {
    for (const productName of category.products) {
      if (products.length >= count) break

      const price = 15 + Math.random() * 185 // Random price between 15-200 JOD
      const stock = Math.floor(Math.random() * 100) // Random stock 0-100

      products.push({
        supplier_id: supplierId,
        name: productName,
        name_en: category.name_en + ' ' + (productIndex + 1),
        description: `منتج ${productName} عالي الجودة`,
        description_en: `High quality ${category.name_en}`,
        price_per_unit_jod: parseFloat(price.toFixed(2)),
        unit: 'كيس',
        unit_en: 'bag',
        stock_quantity: stock,
        weight_kg: 25 + Math.random() * 25,
        volume_m3: 0.01 + Math.random() * 0.09,
        requires_open_bed: Math.random() > 0.8,
        is_available: stock > 0,
        category: category.name
      })

      productIndex++
    }
  }

  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select()

  if (error) {
    console.error(`❌ Failed to create products: ${error.message}`)
    return []
  }

  console.log(`✅ Created ${data.length} products`)
  return data
}

async function createOrder(contractorId, supplierId, products, status, options = {}) {
  const {
    createdDaysAgo = 0,
    deliveryDaysFromNow = 1,
    totalAmount = null,
    includeDelivery = true,
    includePayment = true
  } = options

  // Select random products (1-3 items)
  const numItems = 1 + Math.floor(Math.random() * 3)
  const selectedProducts = products
    .sort(() => Math.random() - 0.5)
    .slice(0, numItems)

  // Calculate totals
  let subtotal = 0
  const items = selectedProducts.map(product => {
    const quantity = 1 + Math.floor(Math.random() * 10)
    const itemTotal = product.price_per_unit_jod * quantity
    subtotal += itemTotal
    return {
      product_id: product.id,
      quantity,
      unit_price: product.price_per_unit_jod,
      total_price: parseFloat(itemTotal.toFixed(2))
    }
  })

  // Override total if specified (for testing thresholds)
  if (totalAmount) {
    const ratio = totalAmount / subtotal
    items.forEach(item => {
      item.total_price = parseFloat((item.total_price * ratio).toFixed(2))
    })
    subtotal = totalAmount
  }

  const deliveryFee = 5.00
  const total = parseFloat((subtotal + deliveryFee).toFixed(2))

  // Create order
  const orderData = {
    contractor_id: contractorId,
    supplier_id: supplierId,
    order_number: generateOrderNumber(),
    status,
    subtotal_jod: parseFloat(subtotal.toFixed(2)),
    delivery_fee_jod: deliveryFee,
    total_jod: total,
    delivery_address: 'شارع الملك حسين، عمان',
    delivery_latitude: 31.9566,
    delivery_longitude: 35.9450,
    scheduled_delivery_date: daysFromNow(deliveryDaysFromNow),
    scheduled_delivery_time: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
    delivery_zone: total < 100 ? 'zone_a' : 'zone_b',
    created_at: daysAgo(createdDaysAgo),
    updated_at: daysAgo(createdDaysAgo)
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (orderError) {
    console.error(`❌ Failed to create order: ${orderError.message}`)
    return null
  }

  // Create order items
  const itemsWithOrderId = items.map(item => ({
    ...item,
    order_id: order.id
  }))

  await supabase.from('order_items').insert(itemsWithOrderId)

  // Create delivery record if needed
  if (includeDelivery && ['accepted', 'in_delivery', 'delivered', 'completed'].includes(status)) {
    const deliveryData = {
      order_id: order.id
    }

    if (status === 'in_delivery') {
      deliveryData.started_at = daysAgo(createdDaysAgo)
    }

    if (status === 'delivered' || status === 'completed') {
      deliveryData.started_at = daysAgo(createdDaysAgo)
      deliveryData.completed_at = daysAgo(createdDaysAgo - 1)

      if (total >= 120) {
        deliveryData.confirmation_pin = '1234'
        deliveryData.pin_verified = true
      } else {
        deliveryData.proof_photo_url = 'https://example.com/proof.jpg'
      }
    }

    await supabase.from('deliveries').insert(deliveryData)
  }

  // Create payment record if needed
  if (includePayment) {
    const paymentStatus = status === 'completed' ? 'released' :
                         status === 'disputed' ? 'escrow_held' :
                         status === 'rejected' || status === 'cancelled' ? 'refunded' :
                         'pending'

    const paymentData = {
      order_id: order.id,
      amount_jod: total,
      status: paymentStatus,
      payment_intent_id: `pi_test_${order.order_number}`,
      payment_method: 'card'
    }

    if (status === 'completed') {
      paymentData.held_at = daysAgo(createdDaysAgo)
      paymentData.released_at = daysAgo(createdDaysAgo - 2)
    } else if (status === 'disputed' || status === 'delivered') {
      paymentData.held_at = daysAgo(createdDaysAgo)
    } else if (status === 'rejected' || status === 'cancelled') {
      paymentData.refunded_at = daysAgo(createdDaysAgo - 1)
    }

    await supabase.from('payments').insert(paymentData)
  }

  console.log(`✅ Created ${status} order #${order.order_number} (${total} JOD)`)
  return order
}

async function main() {
  console.log('🚀 Starting test data generation...\n')

  // Create suppliers
  const suppliers = []
  for (const supplierData of TEST_SUPPLIERS) {
    const supplier = await createSupplier(supplierData)
    if (supplier) {
      suppliers.push(supplier)

      // Create products for this supplier
      const products = await createProducts(supplier.id)
      supplier.products = products
    }
  }

  if (suppliers.length === 0) {
    console.error('❌ No suppliers created, aborting')
    process.exit(1)
  }

  console.log('')

  // Create contractors
  const contractors = []
  for (const contractorData of TEST_CONTRACTORS) {
    const contractor = await createContractor(contractorData)
    if (contractor) {
      contractors.push(contractor)
    }
  }

  if (contractors.length === 0) {
    console.error('❌ No contractors created, aborting')
    process.exit(1)
  }

  console.log('')

  // Create orders in various statuses
  const contractor = contractors[0]

  // For each supplier, create orders in different statuses
  for (let i = 0; i < suppliers.length; i++) {
    const supplier = suppliers[i]

    console.log(`\nCreating orders for ${supplier.business_name}...`)

    // Pending order (created today)
    await createOrder(contractor.id, supplier.id, supplier.products, 'pending', {
      createdDaysAgo: 0,
      deliveryDaysFromNow: 2,
      totalAmount: 45.50
    })

    // Confirmed order (created today, low value for photo proof)
    await createOrder(contractor.id, supplier.id, supplier.products, 'confirmed', {
      createdDaysAgo: 0,
      deliveryDaysFromNow: 1,
      totalAmount: 85.00
    })

    // Confirmed order (created today, high value for PIN)
    await createOrder(contractor.id, supplier.id, supplier.products, 'confirmed', {
      createdDaysAgo: 0,
      deliveryDaysFromNow: 1,
      totalAmount: 250.00
    })

    // Accepted order (scheduled for tomorrow)
    await createOrder(contractor.id, supplier.id, supplier.products, 'accepted', {
      createdDaysAgo: 1,
      deliveryDaysFromNow: 1,
      totalAmount: 120.00
    })

    // In delivery (scheduled for today)
    await createOrder(contractor.id, supplier.id, supplier.products, 'in_delivery', {
      createdDaysAgo: 1,
      deliveryDaysFromNow: 0,
      totalAmount: 340.00
    })

    // Delivered (waiting for payment release, low value)
    await createOrder(contractor.id, supplier.id, supplier.products, 'delivered', {
      createdDaysAgo: 2,
      deliveryDaysFromNow: 0,
      totalAmount: 95.00
    })

    // Delivered (waiting for payment release, high value)
    await createOrder(contractor.id, supplier.id, supplier.products, 'delivered', {
      createdDaysAgo: 2,
      deliveryDaysFromNow: 0,
      totalAmount: 450.00
    })

    // Completed (payment released)
    await createOrder(contractor.id, supplier.id, supplier.products, 'completed', {
      createdDaysAgo: 5,
      deliveryDaysFromNow: -3,
      totalAmount: 180.00
    })

    // Rejected by supplier
    await createOrder(contractor.id, supplier.id, supplier.products, 'rejected', {
      createdDaysAgo: 3,
      deliveryDaysFromNow: 2,
      totalAmount: 60.00
    })

    // Disputed
    await createOrder(contractor.id, supplier.id, supplier.products, 'disputed', {
      createdDaysAgo: 4,
      deliveryDaysFromNow: -1,
      totalAmount: 380.00
    })

    // Cancelled by contractor
    await createOrder(contractor.id, supplier.id, supplier.products, 'cancelled', {
      createdDaysAgo: 2,
      deliveryDaysFromNow: 3,
      totalAmount: 75.00
    })
  }

  console.log('\n✨ Test data generation complete!\n')
  console.log('📊 Summary:')
  console.log(`   - ${suppliers.length} suppliers created`)
  console.log(`   - ${contractors.length} contractors created`)
  console.log(`   - ${suppliers.reduce((sum, s) => sum + s.products.length, 0)} products created`)
  console.log(`   - ${suppliers.length * 11} orders created across all statuses`)
  console.log('\n🔐 Test Accounts:')
  console.log('   Suppliers:')
  TEST_SUPPLIERS.forEach(s => {
    console.log(`     - ${s.email} / ${s.password}`)
  })
  console.log('   Contractors:')
  TEST_CONTRACTORS.forEach(c => {
    console.log(`     - ${c.email} / ${c.password}`)
  })
  console.log('\n✅ Done!')
}

main().catch(console.error)
