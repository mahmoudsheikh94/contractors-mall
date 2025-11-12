import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: Request) {
  // SECURITY: Block seed endpoint in production
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return NextResponse.json(
      {
        success: false,
        message: 'Seed endpoints are disabled in production'
      },
      { status: 403 }
    )
  }

  // SECURITY: Verify seed secret if provided
  const headersList = headers()
  const seedSecret = headersList.get('X-Seed-Secret')

  if (process.env.SEED_SECRET && seedSecret !== process.env.SEED_SECRET) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid or missing seed secret'
      },
      { status: 401 }
    )
  }

  try {
    // Use service role client to bypass RLS for seeding
    const supabase = createServiceRoleClient()

    // We'll create contractor auth users and get their IDs
    let contractor1Id: string = ''
    let contractor2Id: string = ''
    let contractor3Id: string = ''

    // Get supplier IDs from seed-all (they should exist already)
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id')
      .limit(3)

    if (!suppliers || suppliers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No suppliers found. Please run the seed-all endpoint first.'
      }, { status: 400 })
    }

    const supplier1Id = suppliers[0]?.id
    const supplier2Id = suppliers[1]?.id || suppliers[0]?.id
    const supplier3Id = suppliers[2]?.id || suppliers[0]?.id

    // Create contractor auth users
    const contractorUsers = [
      {
        email: 'contractor1@test.jo',
        password: 'Test123456!',
        name: 'سامر المقاول',
        phone: '+962795551111',
      },
      {
        email: 'contractor2@test.jo',
        password: 'Test123456!',
        name: 'عمر البناء',
        phone: '+962795552222',
      },
      {
        email: 'contractor3@test.jo',
        password: 'Test123456!',
        name: 'ياسر الإنشاءات',
        phone: '+962795553333',
      },
    ]

    const contractorIds: string[] = []

    for (const userData of contractorUsers) {
      // Check if user exists by email
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        console.error('Error listing users:', listError)
        continue
      }

      const existingUser = existingUsers.users.find(u => u.email === userData.email)

      if (existingUser) {
        contractorIds.push(existingUser.id)
      } else {
        // Create new user
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          user_metadata: { full_name: userData.name },
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        })

        if (authError) {
          console.error(`Auth user error for ${userData.email}:`, authError)
          return NextResponse.json({
            success: false,
            message: `Failed to create auth user: ${authError.message}`
          }, { status: 500 })
        }

        if (newUser?.user) {
          contractorIds.push(newUser.user.id)
        }
      }
    }

    contractor1Id = contractorIds[0]
    contractor2Id = contractorIds[1]
    contractor3Id = contractorIds[2]

    if (!contractor1Id || !contractor2Id || !contractor3Id) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create contractor auth users'
      }, { status: 500 })
    }

    // Create contractor profiles
    const contractorProfiles = [
      {
        id: contractor1Id,
        role: 'contractor' as const,
        phone: contractorUsers[0].phone,
        full_name: contractorUsers[0].name,
        email: contractorUsers[0].email,
        preferred_language: 'ar' as const,
      },
      {
        id: contractor2Id,
        role: 'contractor' as const,
        phone: contractorUsers[1].phone,
        full_name: contractorUsers[1].name,
        email: contractorUsers[1].email,
        preferred_language: 'ar' as const,
      },
      {
        id: contractor3Id,
        role: 'contractor' as const,
        phone: contractorUsers[2].phone,
        full_name: contractorUsers[2].name,
        email: contractorUsers[2].email,
        preferred_language: 'en' as const,
      },
    ]

    const { error: profilesError } = await supabase
      .from('profiles')
      .upsert(contractorProfiles, { onConflict: 'id' })

    if (profilesError) {
      console.error('Error creating contractor profiles:', profilesError)
    }

    // Create test projects with valid UUIDs (replacing 'p' with 'e')
    const project1Id = 'e1111111-0000-0000-0000-000000000001'
    const project2Id = 'e2222222-0000-0000-0000-000000000002'
    const project3Id = 'e3333333-0000-0000-0000-000000000003'

    const { error: projectsError } = await supabase
      .from('projects')
      .upsert([
        {
          id: project1Id,
          contractor_id: contractor1Id,
          name: 'فيلا السالمية',
          address: 'عمان - دابوق',
          budget_estimate: 50000,
          description: 'مشروع فيلا سكنية',
          is_active: true,
        },
        {
          id: project2Id,
          contractor_id: contractor1Id,
          name: 'عمارة الأردن',
          address: 'عمان - الصويفية',
          budget_estimate: 150000,
          description: 'عمارة سكنية 4 طوابق',
          is_active: true,
        },
        {
          id: project3Id,
          contractor_id: contractor2Id,
          name: 'مجمع تجاري',
          address: 'الزرقاء',
          budget_estimate: 80000,
          description: 'مجمع تجاري صغير',
          is_active: true,
        },
      ], { onConflict: 'id' })

    if (projectsError) {
      console.error('Error creating projects:', projectsError)
      // Continue without project IDs - orders can still be created without projects
    }

    // Create test orders
    const orders: any[] = [
      {
        // Order 1: Pending order
        order_number: `ORD-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor1Id,
        supplier_id: supplier1Id,
        ...(projectsError ? {} : { project_id: project1Id }),
        status: 'pending',
        subtotal_jod: 450.00,
        delivery_fee_jod: 10.00,
        total_jod: 460.00,
        vehicle_type: 'pickup_1t',
        delivery_zone: 'zone_a' as const,
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
        // Order 3: In delivery order
        order_number: `ORD-2025-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor1Id,
        supplier_id: supplier2Id,
        status: 'in_delivery',
        subtotal_jod: 90.00,
        delivery_fee_jod: 8.00,
        total_jod: 98.00,
        vehicle_type: 'pickup_1t',
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
        ...(projectsError ? {} : { project_id: project3Id }),
        status: 'delivered',
        subtotal_jod: 145.00,
        delivery_fee_jod: 10.00,
        total_jod: 155.00,
        vehicle_type: 'pickup_1t',
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
        // Order 6: Cancelled order (with notes about dispute)
        order_number: `ORD-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        contractor_id: contractor1Id,
        supplier_id: supplier3Id,
        status: 'cancelled',
        subtotal_jod: 380.00,
        delivery_fee_jod: 15.00,
        total_jod: 395.00,
        vehicle_type: 'truck_3.5t',
        delivery_zone: 'zone_a',
        delivery_address: 'الدوار السابع، عمان',
        delivery_latitude: 31.9539,
        delivery_longitude: 35.8814,
        delivery_neighborhood: 'الدوار السابع',
        delivery_city: 'عمان',
        scheduled_delivery_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_delivery_time: '14:00-17:00',
        notes: 'ملغي بسبب خلاف: كمية خاطئة - تم توصيل 30 كيس بدلاً من 50',
      },
    ]

    const { data: insertedOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(orders)
      .select()

    if (ordersError) {
      return NextResponse.json({
        success: false,
        message: 'Error creating orders',
        error: ordersError
      }, { status: 500 })
    }

    // Get some products to use for order items
    const { data: products } = await supabase
      .from('products')
      .select('id, name_ar, unit_ar, price_per_unit, weight_kg_per_unit, volume_m3_per_unit')
      .limit(10)

    if (products && products.length > 0 && insertedOrders) {
      const orderItems = []

      for (const order of insertedOrders) {
        // Add 1-3 items per order
        const itemCount = Math.floor(Math.random() * 3) + 1

        for (let i = 0; i < itemCount; i++) {
          const product = products[Math.floor(Math.random() * products.length)]
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

      await supabase
        .from('order_items')
        .insert(orderItems)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${insertedOrders?.length || 0} test orders`,
      orders: insertedOrders
    })

  } catch (error) {
    console.error('Error seeding test orders:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}