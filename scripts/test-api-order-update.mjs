#!/usr/bin/env node

/**
 * Test Script: Simulate Contractor Order Update via Supabase Client
 *
 * This script simulates EXACTLY what the API route does to update
 * an order status, helping us see the real error message.
 *
 * Usage:
 *   node scripts/test-api-order-update.mjs <order-id> <contractor-access-token>
 *
 * To get the contractor access token:
 * 1. Log in as contractor in the web app
 * 2. Open browser DevTools → Application → Cookies
 * 3. Find the sb-*-auth-token cookie
 * 4. Copy the access_token value from the JSON
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zbscashhrdeofvgjnbsb.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2OTQxMzIsImV4cCI6MjA0NTI3MDEzMn0.0t8yTDv_dCFTHuTjlmGiWKtKo4_Upm6V2ZV3ewNZfBk'

// Get arguments
const [,, orderId, accessToken] = process.argv

if (!orderId || !accessToken) {
  console.error('❌ Usage: node test-api-order-update.mjs <order-id> <access-token>')
  console.error('')
  console.error('Example:')
  console.error('  node scripts/test-api-order-update.mjs abc123-def456 eyJhbGc...')
  console.error('')
  console.error('To get access token:')
  console.error('  1. Log in as contractor')
  console.error('  2. DevTools → Application → Cookies')
  console.error('  3. Copy sb-*-auth-token → access_token value')
  process.exit(1)
}

console.log('🔧 Testing Contractor Order Update')
console.log('=' .repeat(60))
console.log('')

// Create Supabase client with contractor's auth token
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
})

async function testOrderUpdate() {
  try {
    // Step 1: Verify authentication
    console.log('Step 1: Verifying authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return
    }

    console.log('✅ Authenticated as:', user.email)
    console.log('   User ID:', user.id)
    console.log('')

    // Step 2: Get order details
    console.log('Step 2: Fetching order details...')
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, contractor_id, supplier_id, status, total_jod')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Failed to fetch order:', orderError)
      return
    }

    console.log('✅ Order found:', order.order_number)
    console.log('   Order ID:', order.id)
    console.log('   Contractor ID:', order.contractor_id)
    console.log('   Current Status:', order.status)
    console.log('')

    // Step 3: Verify ownership
    console.log('Step 3: Verifying ownership...')
    if (order.contractor_id !== user.id) {
      console.error('❌ Ownership mismatch!')
      console.error('   Expected contractor_id:', user.id)
      console.error('   Actual contractor_id:', order.contractor_id)
      return
    }
    console.log('✅ User owns this order')
    console.log('')

    // Step 4: Check current status
    console.log('Step 4: Checking order status...')
    if (order.status !== 'awaiting_contractor_confirmation') {
      console.warn('⚠️  Order status is not awaiting_contractor_confirmation')
      console.warn('   Current status:', order.status)
      console.warn('   This may cause RLS policy to block the update')
      console.warn('   Continuing anyway to see the error...')
    } else {
      console.log('✅ Order status is correct:', order.status)
    }
    console.log('')

    // Step 5: Get delivery status
    console.log('Step 5: Checking delivery confirmation status...')
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('delivery_id, supplier_confirmed, contractor_confirmed')
      .eq('order_id', orderId)
      .single()

    if (deliveryError || !delivery) {
      console.error('❌ Failed to fetch delivery:', deliveryError)
      return
    }

    console.log('✅ Delivery record found')
    console.log('   Supplier confirmed:', delivery.supplier_confirmed)
    console.log('   Contractor confirmed:', delivery.contractor_confirmed)
    console.log('')

    // Step 6: Attempt the order status update
    console.log('Step 6: Attempting order status update...')
    console.log('   Updating to status: delivered')
    console.log('')

    const now = new Date().toISOString()
    const { data: updateData, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: now,
      })
      .eq('id', orderId)
      .select()

    if (updateError) {
      console.error('❌ ORDER UPDATE FAILED!')
      console.error('=' .repeat(60))
      console.error('Error Code:', updateError.code)
      console.error('Error Message:', updateError.message)
      console.error('Error Details:', updateError.details)
      console.error('Error Hint:', updateError.hint)
      console.error('')
      console.error('Full Error Object:')
      console.error(JSON.stringify(updateError, null, 2))
      console.error('=' .repeat(60))
      console.error('')
      console.error('🔍 Diagnosis:')

      if (updateError.code === '42501') {
        console.error('   → PostgreSQL permission denied (42501)')
        console.error('   → RLS policy is blocking the update')
        console.error('   → Check that the contractor UPDATE policy exists and conditions are met')
      } else if (updateError.code === '23505') {
        console.error('   → Unique constraint violation')
        console.error('   → Likely unrelated to RLS')
      } else {
        console.error('   → Unknown error type:', updateError.code)
      }

      return
    }

    console.log('✅ ORDER UPDATE SUCCEEDED!')
    console.log('=' .repeat(60))
    console.log('Updated order:', updateData)
    console.log('=' .repeat(60))
    console.log('')
    console.log('🎉 Test completed successfully!')
    console.log('   The order status was updated to "delivered"')
    console.log('   The RLS policy is working correctly')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testOrderUpdate()
