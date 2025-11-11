import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3Nzc0NSwiZXhwIjoyMDc2MjUzNzQ1fQ.pzlUjpU53N2RVYME1UEStsetc6KcD7BIh33H73BnOU4'

async function diagnose() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('🔍 Testing contractor join query...\n')

  // List all suppliers first
  const { data: allSuppliers } = await supabase
    .from('suppliers')
    .select('id, business_name, owner_id')
    .limit(10)

  console.log(`Found ${allSuppliers?.length || 0} suppliers:`)
  allSuppliers?.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.business_name} (${s.id})`)
  })
  console.log('')

  // Get Jilvar supplier ID
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name')
    .ilike('business_name', '%جلفار%')  // Arabic name
    .maybeSingle()

  if (!supplier) {
    console.log('⚠️ Jilvar supplier not found, using first supplier instead\n')
    const { data: firstSupplier } = await supabase
      .from('suppliers')
      .select('id, business_name')
      .limit(1)
      .single()

    if (!firstSupplier) {
      console.error('❌ No suppliers found at all!')
      return
    }

    console.log(`Using: ${firstSupplier.business_name}\n`)
    return runDiagnostic(supabase, firstSupplier)
  }

  console.log(`✅ Found supplier: ${supplier.business_name} (${supplier.id})\n`)
  await runDiagnostic(supabase, supplier)
}

async function runDiagnostic(supabase: any, supplier: any) {
  // Test the join query (service role bypasses RLS)
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      contractor_id,
      status,
      profiles!contractor_id (
        id,
        full_name,
        phone,
        role
      )
    `)
    .eq('supplier_id', supplier.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Query failed:', error)
    return
  }

  console.log(`Found ${orders.length} orders:\n`)

  orders.forEach((order: any, i: number) => {
    console.log(`${i + 1}. Order: ${order.order_number}`)
    console.log(`   Contractor ID: ${order.contractor_id}`)
    console.log(`   Profiles value:`, order.profiles)
    console.log(`   Type:`, typeof order.profiles)
    console.log(`   Is array:`, Array.isArray(order.profiles))

    if (Array.isArray(order.profiles)) {
      console.log(`   Array length:`, order.profiles.length)
      if (order.profiles.length > 0) {
        console.log(`   First item:`, order.profiles[0])
      }
    }
    console.log('')
  })
}

diagnose().catch(console.error)
