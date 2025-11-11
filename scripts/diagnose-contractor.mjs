#!/usr/bin/env node
/**
 * Diagnostic Script: Why is Contractor showing as N/A?
 * This script connects directly to Supabase and tests the join query
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3Nzc0NSwiZXhwIjoyMDc2MjUzNzQ1fQ.pzlUjpU53N2RVYME1UEStsetc6KcD7BIh33H73BnOU4'

// Create client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔍 Running diagnostic queries...\n')

// Query 1: Test the exact join used in the frontend
console.log('=' .repeat(80))
console.log('QUERY 1: Testing frontend join (with RLS bypassed via service role)')
console.log('='.repeat(80))

const { data: ordersWithJoin, error: joinError } = await supabase
  .from('orders')
  .select(`
    id,
    order_number,
    contractor_id,
    status,
    supplier_id,
    profiles!contractor_id (
      id,
      full_name,
      phone,
      role
    )
  `)
  .eq('supplier_id', await getJilvarSupplierId())
  .order('created_at', { ascending: false })
  .limit(5)

if (joinError) {
  console.error('❌ Join query failed:', joinError)
} else {
  console.log(`✅ Found ${ordersWithJoin.length} orders\n`)
  ordersWithJoin.forEach((order, index) => {
    console.log(`Order #${index + 1}: ${order.order_number}`)
    console.log(`  Contractor ID: ${order.contractor_id}`)
    console.log(`  Profiles data:`, order.profiles)
    console.log(`  Profiles type:`, typeof order.profiles)
    console.log(`  Is array?:`, Array.isArray(order.profiles))
    console.log('')
  })
}

// Query 2: Check if contractor profiles exist
console.log('\n' + '='.repeat(80))
console.log('QUERY 2: Checking if contractor profiles exist')
console.log('='.repeat(80))

const { data: orders } = await supabase
  .from('orders')
  .select('id, order_number, contractor_id')
  .eq('supplier_id', await getJilvarSupplierId())
  .limit(5)

for (const order of orders || []) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('id', order.contractor_id)
    .single()

  console.log(`Order ${order.order_number}:`)
  console.log(`  Contractor ID: ${order.contractor_id}`)
  console.log(`  Profile exists: ${profile ? 'YES' : 'NO'}`)
  if (profile) {
    console.log(`  Name: ${profile.full_name}`)
    console.log(`  Phone: ${profile.phone}`)
    console.log(`  Role: ${profile.role}`)
  }
  console.log('')
}

// Query 3: Check RLS policies
console.log('\n' + '='.repeat(80))
console.log('QUERY 3: Checking RLS policies on profiles table')
console.log('='.repeat(80))

const { data: policies } = await supabase
  .rpc('exec_sql', {
    sql: `
      SELECT policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE tablename = 'profiles'
      ORDER BY policyname;
    `
  })

if (policies) {
  console.log('RLS Policies:', JSON.stringify(policies, null, 2))
}

console.log('\n' + '='.repeat(80))
console.log('✅ Diagnostic complete!')
console.log('='.repeat(80))

// Helper function
async function getJilvarSupplierId() {
  const { data } = await supabase
    .from('suppliers')
    .select('id')
    .ilike('business_name', '%Jilvar%')
    .single()

  return data?.id
}
