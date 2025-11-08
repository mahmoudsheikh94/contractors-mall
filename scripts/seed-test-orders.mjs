#!/usr/bin/env node

/**
 * Script to seed test orders into the database
 * Run with: node scripts/seed-test-orders.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedTestOrders() {
  console.log('🌱 Starting to seed test orders...')

  try {
    // Test user IDs (these should already exist from seed-dev.sql)
    const contractor1Id = 'b1111111-0000-0000-0000-000000000001'
    const contractor2Id = 'b2222222-0000-0000-0000-000000000002'
    const contractor3Id = 'b3333333-0000-0000-0000-000000000003'

    const supplier1Id = 'd1111111-1111-1111-1111-111111111111'
    const supplier2Id = 'd2222222-2222-2222-2222-222222222222'
    const supplier3Id = 'd3333333-3333-3333-3333-333333333333'

    // Check if suppliers exist
    const { data: suppliers, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .in('id', [supplier1Id, supplier2Id, supplier3Id])

    if (supplierError) {
      console.error('Error checking suppliers:', supplierError)
      return
    }

    console.log(`✓ Found ${suppliers.length} existing suppliers`)

    // Create test contractors if they don't exist
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', [contractor1Id, contractor2Id, contractor3Id])

    if (!existingProfiles || existingProfiles.length === 0) {
      console.log('Creating test contractor profiles...')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: contractor1Id,
            role: 'contractor',
            phone: '+962795551111',
            full_name: 'سامر المقاول',
            email: 'contractor1@test.jo',
            preferred_language: 'ar',
          },
          {
            id: contractor2Id,
            role: 'contractor',
            phone: '+962795552222',
            full_name: 'عمر البناء',
            email: 'contractor2@test.jo',
            preferred_language: 'ar',
          },
          {
            id: contractor3Id,
            role: 'contractor',
            phone: '+962795553333',
            full_name: 'ياسر الإنشاءات',
            email: 'contractor3@test.jo',
            preferred_language: 'en',
          },
        ])

      if (profileError) {
        console.error('Error creating contractor profiles:', profileError)
        return
      }
      console.log('✓ Created 3 test contractor profiles')
    }

    // Create test projects
    console.log('Creating test projects...')
    const { error: projectError } = await supabase
      .from('projects')
      .insert([
        {
          id: 'p1111111-0000-0000-0000-000000000001',
          contractor_id: contractor1Id,
          name: 'فيلا السالمية',
          address: 'عمان - دابوق',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          budget_jod: 50000,
          notes: 'مشروع فيلا سكنية',
        },
        {
          id: 'p2222222-0000-0000-0000-000000000002',
          contractor_id: contractor1Id,
          name: 'عمارة الأردن',
          address: 'عمان - الصويفية',
          start_date: '2024-03-01',
          end_date: '2025-03-01',
          budget_jod: 150000,
          notes: 'عمارة سكنية 4 طوابق',
        },
        {
          id: 'p3333333-0000-0000-0000-000000000003',
          contractor_id: contractor2Id,
          name: 'مجمع تجاري',
          address: 'الزرقاء',
          start_date: '2024-02-01',
          end_date: '2024-10-01',
          budget_jod: 80000,
          notes: 'مجمع تجاري صغير',
        },
      ])
      .select()

    if (projectError && !projectError.message.includes('duplicate')) {
      console.error('Error creating projects:', projectError)
    } else {
      console.log('✓ Created test projects')
    }

    // Create test orders
    console.log('Creating test orders...')
    const now = new Date()
    const orders = [
      {
        // Order 1: Pending order
        order_number: `ORD-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor1Id,
        supplier_id: supplier1Id,
        project_id: 'p1111111-0000-0000-0000-000000000001',
        status: 'pending',
        subtotal_jod: 450.00,
        delivery_fee_jod: 10.00,
        total_jod: 460.00,
        vehicle_type: 'pickup_1t',
        vehicle_class_id: '11111111-1111-1111-1111-111111111111',
        delivery_zone: 'zone_a',
        delivery_address: 'شارع الجامعة الأردنية، عمان',
        delivery_latitude: 31.9539,
        delivery_longitude: 35.9106,
        delivery_neighborhood: 'الجبيهة',
        delivery_city: 'عمان',
        scheduled_delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_delivery_time: '09:00-12:00',
        notes: 'يرجى الاتصال قبل الوصول',
      },
      {
        // Order 2: Confirmed order
        order_number: `ORD-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor2Id,
        supplier_id: supplier1Id,
        status: 'confirmed',
        subtotal_jod: 1250.00,
        delivery_fee_jod: 15.00,
        total_jod: 1265.00,
        vehicle_type: 'truck_3.5t',
        vehicle_class_id: '22222222-2222-2222-2222-222222222222',
        delivery_zone: 'zone_b',
        delivery_address: 'المنطقة الصناعية، الزرقاء',
        delivery_latitude: 32.0709,
        delivery_longitude: 36.0880,
        delivery_neighborhood: 'المنطقة الصناعية',
        delivery_city: 'الزرقاء',
        scheduled_delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_delivery_time: '14:00-17:00',
      },
      {
        // Order 3: On the way order
        order_number: `ORD-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor1Id,
        supplier_id: supplier2Id,
        status: 'on_the_way',
        subtotal_jod: 90.00,
        delivery_fee_jod: 8.00,
        total_jod: 98.00,
        vehicle_type: 'pickup_1t',
        vehicle_class_id: '11111111-1111-1111-1111-111111111111',
        delivery_zone: 'zone_a',
        delivery_address: 'عبدون، عمان',
        delivery_latitude: 31.9539,
        delivery_longitude: 35.8814,
        delivery_neighborhood: 'عبدون',
        delivery_city: 'عمان',
        scheduled_delivery_date: new Date().toISOString().split('T')[0],
        scheduled_delivery_time: '10:00-13:00',
      },
      {
        // Order 4: Delivered order
        order_number: `ORD-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor3Id,
        supplier_id: supplier2Id,
        project_id: 'p3333333-0000-0000-0000-000000000003',
        status: 'delivered',
        subtotal_jod: 145.00,
        delivery_fee_jod: 10.00,
        total_jod: 155.00,
        vehicle_type: 'pickup_1t',
        vehicle_class_id: '11111111-1111-1111-1111-111111111111',
        delivery_zone: 'zone_a',
        delivery_address: 'شارع المطار، ماركا',
        delivery_latitude: 31.9722,
        delivery_longitude: 35.9917,
        delivery_neighborhood: 'ماركا',
        delivery_city: 'عمان',
        scheduled_delivery_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_delivery_time: '09:00-12:00',
        delivery_notes: 'تم التسليم في الموعد المحدد',
      },
      {
        // Order 5: Completed order
        order_number: `ORD-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor2Id,
        supplier_id: supplier3Id,
        status: 'completed',
        subtotal_jod: 2500.00,
        delivery_fee_jod: 22.00,
        total_jod: 2522.00,
        vehicle_type: 'flatbed_5t',
        vehicle_class_id: '33333333-3333-3333-3333-333333333333',
        delivery_zone: 'zone_b',
        delivery_address: 'العقبة - المنطقة الصناعية',
        delivery_latitude: 29.5321,
        delivery_longitude: 35.0063,
        delivery_neighborhood: 'المنطقة الصناعية',
        delivery_city: 'العقبة',
        scheduled_delivery_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_delivery_time: '08:00-11:00',
      },
      {
        // Order 6: Disputed order
        order_number: `ORD-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor1Id,
        supplier_id: supplier3Id,
        status: 'disputed',
        subtotal_jod: 380.00,
        delivery_fee_jod: 15.00,
        total_jod: 395.00,
        vehicle_type: 'truck_3.5t',
        vehicle_class_id: '22222222-2222-2222-2222-222222222222',
        delivery_zone: 'zone_a',
        delivery_address: 'الدوار السابع، عمان',
        delivery_latitude: 31.9539,
        delivery_longitude: 35.8814,
        delivery_neighborhood: 'الدوار السابع',
        delivery_city: 'عمان',
        scheduled_delivery_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_delivery_time: '14:00-17:00',
        disputed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        dispute_reason: 'كمية خاطئة - تم توصيل 30 كيس بدلاً من 50',
      },
    ]

    const { data: insertedOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(orders)
      .select()

    if (ordersError) {
      console.error('Error creating orders:', ordersError)
      return
    }

    console.log(`✓ Created ${insertedOrders.length} test orders`)

    // Create order items for each order
    console.log('Creating order items...')

    // Get some products to use
    const { data: products } = await supabase
      .from('products')
      .select('id, name_ar, unit_ar, price_per_unit, weight_kg_per_unit, volume_m3_per_unit')
      .limit(10)

    if (!products || products.length === 0) {
      console.log('No products found. Creating sample products...')

      // Create sample products
      const { error: productError } = await supabase
        .from('products')
        .insert([
          {
            supplier_id: supplier1Id,
            category_id: 'c5555555-5555-5555-5555-555555555555',
            sku: 'CEM-PRT-50',
            name_ar: 'أسمنت بورتلاندي 50 كجم',
            name_en: 'Portland Cement 50kg',
            description_ar: 'أسمنت بورتلاندي عالي الجودة',
            description_en: 'High quality Portland cement',
            unit_ar: 'كيس',
            unit_en: 'bag',
            price_per_unit: 4.50,
            weight_kg_per_unit: 50,
            volume_m3_per_unit: 0.035,
            min_order_quantity: 10,
            is_available: true,
          },
          {
            supplier_id: supplier1Id,
            category_id: 'c6666666-6666-6666-6666-666666666666',
            sku: 'STL-RBR-12',
            name_ar: 'حديد تسليح 12 ملم',
            name_en: 'Rebar 12mm',
            description_ar: 'حديد تسليح عالي الجودة',
            description_en: 'High quality reinforcement steel',
            unit_ar: 'طن',
            unit_en: 'ton',
            price_per_unit: 625.00,
            weight_kg_per_unit: 1000,
            volume_m3_per_unit: 0.089,
            min_order_quantity: 1,
            is_available: true,
          },
        ])
        .select()

      if (productError) {
        console.error('Error creating products:', productError)
      }
    }

    // Re-fetch products
    const { data: availableProducts } = await supabase
      .from('products')
      .select('id, name_ar, unit_ar, price_per_unit, weight_kg_per_unit, volume_m3_per_unit')
      .limit(10)

    if (availableProducts && availableProducts.length > 0 && insertedOrders) {
      const orderItems = []

      for (const order of insertedOrders) {
        // Add 1-3 items per order
        const itemCount = Math.floor(Math.random() * 3) + 1

        for (let i = 0; i < itemCount; i++) {
          const product = availableProducts[Math.floor(Math.random() * availableProducts.length)]
          const quantity = Math.floor(Math.random() * 50) + 1
          const totalPrice = quantity * product.price_per_unit

          orderItems.push({
            order_id: order.id,
            product_id: product.id,
            quantity: quantity,
            unit_price: product.price_per_unit,
            total_price: totalPrice,
            product_name: product.name_ar,
            unit: product.unit_ar,
            unit_price_jod: product.price_per_unit,
            total_jod: totalPrice,
            weight_kg: quantity * (product.weight_kg_per_unit || 0),
            volume_m3: quantity * (product.volume_m3_per_unit || 0),
          })
        }
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
      } else {
        console.log(`✓ Created ${orderItems.length} order items`)
      }
    }

    console.log('\n✅ Test data seeding completed successfully!')
    console.log('\n📝 Test Account Credentials:')
    console.log('Contractor 1: contractor1@test.jo')
    console.log('Contractor 2: contractor2@test.jo')
    console.log('Contractor 3: contractor3@test.jo')
    console.log('\nNote: These test orders have been created for existing suppliers.')
    console.log('You can now view them in the contractor and supplier portals.')

  } catch (error) {
    console.error('❌ Error seeding test orders:', error)
  }
}

// Run the seeding function
seedTestOrders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })