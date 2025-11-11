#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3Nzc0NSwiZXhwIjoyMDc2MjUzNzQ1fQ.pzlUjpU53N2RVYME1UEStsetc6KcD7BIh33H73BnOU4'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🧪 Testing Fixed API Endpoints\n')
console.log('===============================\n')

async function testOrderNotes() {
  console.log('1️⃣  Testing order_notes with created_by relationship...')

  const { data, error } = await supabase
    .from('order_notes')
    .select(`
      id,
      note,
      is_internal,
      created_at,
      updated_at,
      created_by,
      creator:created_by (
        id,
        full_name
      )
    `)
    .limit(5)

  if (error) {
    console.log('   ❌ FAILED:', error.message)
    console.log('   Details:', error)
    return false
  } else {
    console.log('   ✅ SUCCESS - order_notes.created_by relationship working!')
    console.log(`   Found ${data.length} notes`)
    if (data.length > 0) {
      console.log('   Sample:', JSON.stringify(data[0], null, 2))
    }
    return true
  }
}

async function testOrderActivities() {
  console.log('\n2️⃣  Testing order_activities with created_by relationship...')

  const { data, error } = await supabase
    .from('order_activities')
    .select(`
      id,
      activity_type,
      description,
      metadata,
      created_at,
      created_by,
      creator:created_by (
        id,
        full_name
      )
    `)
    .limit(5)

  if (error) {
    console.log('   ❌ FAILED:', error.message)
    console.log('   Details:', error)
    return false
  } else {
    console.log('   ✅ SUCCESS - order_activities.created_by relationship working!')
    console.log(`   Found ${data.length} activities`)
    if (data.length > 0) {
      console.log('   Sample:', JSON.stringify(data[0], null, 2))
    }
    return true
  }
}

async function testMessages() {
  console.log('\n3️⃣  Testing messages with sender_id relationship...')

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      message,
      sender_type,
      is_read,
      created_at,
      sender_id,
      sender:sender_id (
        id,
        full_name,
        email
      )
    `)
    .limit(5)

  if (error) {
    console.log('   ❌ FAILED:', error.message)
    console.log('   Details:', error)
    return false
  } else {
    console.log('   ✅ SUCCESS - messages table accessible!')
    console.log(`   Found ${data.length} messages`)
    if (data.length > 0) {
      console.log('   Sample:', JSON.stringify(data[0], null, 2))
    }
    return true
  }
}

async function testNotifications() {
  console.log('\n4️⃣  Testing in_app_notifications with user_id relationship...')

  const { data, error } = await supabase
    .from('in_app_notifications')
    .select(`
      id,
      type,
      title,
      message,
      is_read,
      created_at,
      user_id,
      user:user_id (
        id,
        full_name,
        email
      )
    `)
    .limit(5)

  if (error) {
    console.log('   ❌ FAILED:', error.message)
    console.log('   Details:', error)
    return false
  } else {
    console.log('   ✅ SUCCESS - in_app_notifications table accessible!')
    console.log(`   Found ${data.length} notifications`)
    if (data.length > 0) {
      console.log('   Sample:', JSON.stringify(data[0], null, 2))
    }
    return true
  }
}

async function testMessageAttachments() {
  console.log('\n5️⃣  Testing message_attachments table...')

  const { data, error } = await supabase
    .from('message_attachments')
    .select(`
      id,
      file_name,
      file_url,
      created_at
    `)
    .limit(5)

  if (error) {
    console.log('   ❌ FAILED:', error.message)
    return false
  } else {
    console.log('   ✅ SUCCESS - message_attachments table accessible!')
    console.log(`   Found ${data.length} attachments`)
    return true
  }
}

async function testNotificationPreferences() {
  console.log('\n6️⃣  Testing notification_preferences table...')

  const { data, error } = await supabase
    .from('notification_preferences')
    .select(`
      id,
      user_id,
      email_new_order,
      app_messages
    `)
    .limit(5)

  if (error) {
    console.log('   ❌ FAILED:', error.message)
    return false
  } else {
    console.log('   ✅ SUCCESS - notification_preferences table accessible!')
    console.log(`   Found ${data.length} preference records`)
    return true
  }
}

async function main() {
  const results = []

  results.push(await testOrderNotes())
  results.push(await testOrderActivities())
  results.push(await testMessages())
  results.push(await testNotifications())
  results.push(await testMessageAttachments())
  results.push(await testNotificationPreferences())

  const passed = results.filter(r => r).length
  const total = results.length

  console.log('\n===============================')
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed\n`)

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Schema fixes successful!')
    console.log('\n✅ All PostgREST errors should now be resolved.')
    console.log('✅ API endpoints can access tables and relationships.')
  } else {
    console.log('⚠️  Some tests failed. Review errors above.')
  }
}

main()
