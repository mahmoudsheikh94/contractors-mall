import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const results: any = {
      suppliers: 0,
      categories: 0,
      products: 0,
      zoneFees: 0,
      errors: []
    }

    // Step 1: Create test supplier profiles
    const supplier1Id = 'd1111111-1111-1111-1111-111111111111'
    const supplier2Id = 'd2222222-2222-2222-2222-222222222222'
    const supplier3Id = 'd3333333-3333-3333-3333-333333333333'

    const supplierProfiles = [
      {
        id: supplier1Id,
        role: 'supplier_admin' as const,
        phone: '+962795554444',
        full_name: 'مدير شركة الموّاد',
        email: 'supplier1@contractors.jo',
        preferred_language: 'ar' as const,
      },
      {
        id: supplier2Id,
        role: 'supplier_admin' as const,
        phone: '+962795555555',
        full_name: 'مدير شركة البناء الحديث',
        email: 'supplier2@contractors.jo',
        preferred_language: 'ar' as const,
      },
      {
        id: supplier3Id,
        role: 'supplier_admin' as const,
        phone: '+962795556666',
        full_name: 'مدير شركة الإنشاءات الممتازة',
        email: 'supplier3@contractors.jo',
        preferred_language: 'ar' as const,
      },
    ]

    // Insert profiles (upsert to avoid conflicts)
    const { error: profilesError } = await supabase
      .from('profiles')
      .upsert(supplierProfiles, { onConflict: 'id' })

    if (profilesError) {
      results.errors.push(`Profiles error: ${profilesError.message}`)
    }

    // Step 2: Create suppliers
    const suppliers = [
      {
        id: supplier1Id,
        owner_id: supplier1Id,
        business_name: 'شركة الموّاد الأردنية',
        business_name_en: 'Jordan Materials Company',
        phone: '+962795554444',
        email: 'supplier1@contractors.jo',
        address: 'عمان - الجبيهة',
        latitude: 31.9539,
        longitude: 35.9106,
        radius_km_zone_a: 15.0,
        radius_km_zone_b: 50.0,
        is_verified: true,
        rating_average: 4.5,
        rating_count: 23,
      },
      {
        id: supplier2Id,
        owner_id: supplier2Id,
        business_name: 'شركة البناء الحديث',
        business_name_en: 'Modern Construction Co.',
        phone: '+962795555555',
        email: 'supplier2@contractors.jo',
        address: 'الزرقاء - المنطقة الصناعية',
        latitude: 32.0709,
        longitude: 36.0880,
        radius_km_zone_a: 10.0,
        radius_km_zone_b: 40.0,
        is_verified: true,
        rating_average: 4.2,
        rating_count: 15,
      },
      {
        id: supplier3Id,
        owner_id: supplier3Id,
        business_name: 'شركة الإنشاءات الممتازة',
        business_name_en: 'Premium Construction Ltd.',
        phone: '+962795556666',
        email: 'supplier3@contractors.jo',
        address: 'عمان - الصويفية',
        latitude: 31.9522,
        longitude: 35.8689,
        radius_km_zone_a: 12.0,
        radius_km_zone_b: 45.0,
        is_verified: true,
        rating_average: 4.8,
        rating_count: 42,
      },
    ]

    const { data: insertedSuppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .upsert(suppliers, { onConflict: 'id' })
      .select()

    if (suppliersError) {
      results.errors.push(`Suppliers error: ${suppliersError.message}`)
    } else {
      results.suppliers = insertedSuppliers?.length || 0
    }

    // Step 3: Create zone fees
    const zoneFees = [
      { supplier_id: supplier1Id, zone: 'zone_a' as const, base_fee_jod: 10.00 },
      { supplier_id: supplier1Id, zone: 'zone_b' as const, base_fee_jod: 15.00 },
      { supplier_id: supplier2Id, zone: 'zone_a' as const, base_fee_jod: 8.00 },
      { supplier_id: supplier2Id, zone: 'zone_b' as const, base_fee_jod: 12.00 },
      { supplier_id: supplier3Id, zone: 'zone_a' as const, base_fee_jod: 12.00 },
      { supplier_id: supplier3Id, zone: 'zone_b' as const, base_fee_jod: 18.00 },
    ]

    const { data: insertedZoneFees, error: zoneFeesError } = await supabase
      .from('supplier_zone_fees')
      .upsert(zoneFees, { onConflict: 'supplier_id,zone' })
      .select()

    if (zoneFeesError) {
      results.errors.push(`Zone fees error: ${zoneFeesError.message}`)
    } else {
      results.zoneFees = insertedZoneFees?.length || 0
    }

    // Step 4: Create categories
    const categories = [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        name_ar: 'مواد البناء الأساسية',
        name_en: 'Basic Construction Materials',
        slug: 'basic-construction',
        description_ar: 'الإسمنت، الحديد، الطوب والخرسانة',
        description_en: 'Cement, steel, bricks and concrete',
        display_order: 1,
        is_active: true,
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        name_ar: 'مواد التشطيب',
        name_en: 'Finishing Materials',
        slug: 'finishing',
        description_ar: 'البلاط، السيراميك، الدهانات والجبس',
        description_en: 'Tiles, ceramics, paints and plaster',
        display_order: 2,
        is_active: true,
      },
      {
        id: 'c3333333-3333-3333-3333-333333333333',
        name_ar: 'الأدوات الصحية والكهربائية',
        name_en: 'Plumbing & Electrical',
        slug: 'plumbing-electrical',
        description_ar: 'أنابيب، أسلاك، مفاتيح وأدوات صحية',
        description_en: 'Pipes, wires, switches and plumbing fixtures',
        display_order: 3,
        is_active: true,
      },
      {
        id: 'c4444444-4444-4444-4444-444444444444',
        name_ar: 'الأخشاب والمعادن',
        name_en: 'Wood & Metals',
        slug: 'wood-metals',
        description_ar: 'أخشاب، ألومنيوم، حديد مشغول',
        description_en: 'Timber, aluminum, wrought iron',
        display_order: 4,
        is_active: true,
      },
    ]

    const { data: insertedCategories, error: categoriesError } = await supabase
      .from('categories')
      .upsert(categories, { onConflict: 'id' })
      .select()

    if (categoriesError) {
      results.errors.push(`Categories error: ${categoriesError.message}`)
    } else {
      results.categories = insertedCategories?.length || 0
    }

    // Step 5: Create products
    const products = [
      // Supplier 1 products
      {
        supplier_id: supplier1Id,
        category_id: 'c1111111-1111-1111-1111-111111111111',
        sku: 'CEM-001',
        name_ar: 'إسمنت رمادي',
        name_en: 'Gray Cement',
        description_ar: 'إسمنت رمادي عادي - كيس 50 كجم',
        description_en: 'Regular gray cement - 50kg bag',
        unit_ar: 'كيس',
        unit_en: 'bag',
        price_per_unit: 4.50,
        min_order_quantity: 10,
        weight_kg_per_unit: 50,
        volume_m3_per_unit: 0.04,
        is_available: true,
        stock_quantity: 1000,
      },
      {
        supplier_id: supplier1Id,
        category_id: 'c1111111-1111-1111-1111-111111111111',
        sku: 'STL-001',
        name_ar: 'حديد تسليح 12 ملم',
        name_en: 'Rebar 12mm',
        description_ar: 'حديد تسليح قطر 12 ملم - طول 12 متر',
        description_en: 'Reinforcement steel 12mm diameter - 12m length',
        unit_ar: 'قضيب',
        unit_en: 'bar',
        price_per_unit: 8.75,
        min_order_quantity: 50,
        weight_kg_per_unit: 10.6,
        length_m_per_unit: 12,
        requires_open_bed: true,
        is_available: true,
        stock_quantity: 500,
      },
      {
        supplier_id: supplier1Id,
        category_id: 'c1111111-1111-1111-1111-111111111111',
        sku: 'BRK-001',
        name_ar: 'طوب أحمر',
        name_en: 'Red Bricks',
        description_ar: 'طوب أحمر حراري - 1000 قطعة',
        description_en: 'Red clay bricks - 1000 pieces',
        unit_ar: 'ألف',
        unit_en: 'thousand',
        price_per_unit: 85.00,
        min_order_quantity: 1,
        weight_kg_per_unit: 2800,
        volume_m3_per_unit: 1.2,
        is_available: true,
        stock_quantity: 50,
      },
      // Supplier 2 products
      {
        supplier_id: supplier2Id,
        category_id: 'c2222222-2222-2222-2222-222222222222',
        sku: 'TIL-001',
        name_ar: 'بلاط سيراميك 60x60',
        name_en: 'Ceramic Tiles 60x60',
        description_ar: 'بلاط سيراميك أرضي 60x60 سم - كرتون 4 قطع',
        description_en: 'Floor ceramic tiles 60x60cm - box of 4 pieces',
        unit_ar: 'كرتون',
        unit_en: 'box',
        price_per_unit: 12.50,
        min_order_quantity: 10,
        weight_kg_per_unit: 28,
        volume_m3_per_unit: 0.08,
        is_available: true,
        stock_quantity: 200,
      },
      {
        supplier_id: supplier2Id,
        category_id: 'c2222222-2222-2222-2222-222222222222',
        sku: 'PNT-001',
        name_ar: 'دهان أبيض جوتن',
        name_en: 'Jotun White Paint',
        description_ar: 'دهان داخلي أبيض - جالون 20 لتر',
        description_en: 'Interior white paint - 20L gallon',
        unit_ar: 'جالون',
        unit_en: 'gallon',
        price_per_unit: 45.00,
        min_order_quantity: 2,
        weight_kg_per_unit: 24,
        volume_m3_per_unit: 0.02,
        is_available: true,
        stock_quantity: 100,
      },
      {
        supplier_id: supplier2Id,
        category_id: 'c2222222-2222-2222-2222-222222222222',
        sku: 'GYP-001',
        name_ar: 'جبس بورد',
        name_en: 'Gypsum Board',
        description_ar: 'لوح جبس بورد 120x240 سم',
        description_en: 'Gypsum board 120x240cm',
        unit_ar: 'لوح',
        unit_en: 'sheet',
        price_per_unit: 6.50,
        min_order_quantity: 10,
        weight_kg_per_unit: 12,
        length_m_per_unit: 2.4,
        is_available: true,
        stock_quantity: 300,
      },
      // Supplier 3 products
      {
        supplier_id: supplier3Id,
        category_id: 'c3333333-3333-3333-3333-333333333333',
        sku: 'PIP-001',
        name_ar: 'أنابيب PVC 4 بوصة',
        name_en: 'PVC Pipes 4 inch',
        description_ar: 'أنبوب PVC قطر 4 بوصة - طول 6 متر',
        description_en: 'PVC pipe 4 inch diameter - 6m length',
        unit_ar: 'قطعة',
        unit_en: 'piece',
        price_per_unit: 12.00,
        min_order_quantity: 20,
        weight_kg_per_unit: 8,
        length_m_per_unit: 6,
        requires_open_bed: true,
        is_available: true,
        stock_quantity: 250,
      },
      {
        supplier_id: supplier3Id,
        category_id: 'c3333333-3333-3333-3333-333333333333',
        sku: 'WIR-001',
        name_ar: 'سلك كهرباء 2.5 ملم',
        name_en: 'Electric Wire 2.5mm',
        description_ar: 'سلك كهربائي 2.5 ملم - لفة 100 متر',
        description_en: 'Electric wire 2.5mm - 100m roll',
        unit_ar: 'لفة',
        unit_en: 'roll',
        price_per_unit: 35.00,
        min_order_quantity: 1,
        weight_kg_per_unit: 4.5,
        is_available: true,
        stock_quantity: 150,
      },
      {
        supplier_id: supplier3Id,
        category_id: 'c4444444-4444-4444-4444-444444444444',
        sku: 'WOD-001',
        name_ar: 'خشب صنوبر',
        name_en: 'Pine Wood',
        description_ar: 'لوح خشب صنوبر 5x10 سم - طول 4 متر',
        description_en: 'Pine wood plank 5x10cm - 4m length',
        unit_ar: 'لوح',
        unit_en: 'plank',
        price_per_unit: 15.00,
        min_order_quantity: 10,
        weight_kg_per_unit: 8,
        length_m_per_unit: 4,
        requires_open_bed: true,
        is_available: true,
        stock_quantity: 200,
      },
    ]

    const { data: insertedProducts, error: productsError } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'sku' })
      .select()

    if (productsError) {
      results.errors.push(`Products error: ${productsError.message}`)
    } else {
      results.products = insertedProducts?.length || 0
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0
        ? `Successfully seeded: ${results.suppliers} suppliers, ${results.categories} categories, ${results.products} products`
        : 'Seeding completed with some errors',
      results,
    })

  } catch (error) {
    console.error('Error seeding all data:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
