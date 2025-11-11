#!/usr/bin/env node

/**
 * Database Schema Inspector
 * Queries Supabase to get actual schema state
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbscashhrdeofvgjnbsb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase Database Schema\n');
  console.log('='.repeat(80));

  // 1. Check all tables
  console.log('\n📋 TABLES:\n');
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  }).catch(() => ({ data: null, error: 'RPC not available' }));

  if (tablesError) {
    // Fallback: try to list tables by querying them directly
    const tableNames = [
      'profiles', 'suppliers', 'vehicles', 'supplier_zone_fees',
      'categories', 'products', 'projects', 'orders', 'order_items',
      'deliveries', 'payments', 'disputes', 'settings',
      'order_notes', 'order_tags', 'order_communications',
      'in_app_notifications', 'dispute_communications', 'dispute_site_visits',
      'wallet_transactions', 'contractor_insights', 'supplier_profiles',
      'admin_conversations', 'admin_conversation_participants',
      'admin_messages', 'email_templates'
    ];

    for (const tableName of tableNames) {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      if (!error) {
        console.log(`  ✅ ${tableName}`);
      }
    }
  } else if (tables) {
    tables.forEach(t => console.log(`  ✅ ${t.table_name}`));
  }

  // 2. Check supplier_zone_fees columns
  console.log('\n📊 SUPPLIER_ZONE_FEES COLUMNS:\n');
  const { data: zoneFees } = await supabase
    .from('supplier_zone_fees')
    .select('*')
    .limit(1);

  if (zoneFees && zoneFees[0]) {
    const columns = Object.keys(zoneFees[0]);
    columns.forEach(col => {
      if (col === 'vehicle_class_id') {
        console.log(`  ⚠️  ${col} (SHOULD BE REMOVED)`);
      } else {
        console.log(`  ✅ ${col}`);
      }
    });
  } else {
    console.log('  ℹ️  No data in supplier_zone_fees to inspect columns');
  }

  // 3. Check order_items columns
  console.log('\n📦 ORDER_ITEMS COLUMNS:\n');
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .limit(1);

  if (orderItems && orderItems[0]) {
    const columns = Object.keys(orderItems[0]);
    columns.forEach(col => {
      console.log(`  ✅ ${col}`);
    });
  } else {
    console.log('  ℹ️  No data in order_items to inspect columns');
  }

  // 4. Check orders table for vehicle_class_id
  console.log('\n🚚 ORDERS TABLE - VEHICLE COLUMNS:\n');
  const { data: orders } = await supabase
    .from('orders')
    .select('id, vehicle_class_id, vehicle_type')
    .limit(3);

  if (orders) {
    console.log(`  Found ${orders.length} orders`);
    orders.forEach((order, idx) => {
      console.log(`  Order ${idx + 1}: vehicle_class_id=${order.vehicle_class_id}, vehicle_type=${order.vehicle_type}`);
    });
  }

  // 5. Check profiles for email columns
  console.log('\n👤 PROFILES TABLE - EMAIL COLUMNS:\n');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, email_verified, email_verified_at')
    .limit(1);

  if (profiles && profiles[0]) {
    const columns = Object.keys(profiles[0]);
    const emailCols = columns.filter(c => c.includes('email'));
    emailCols.forEach(col => console.log(`  ✅ ${col}`));
  }

  // 6. Check RLS policies
  console.log('\n🔒 RLS POLICIES:\n');

  const criticalTables = [
    'profiles', 'orders', 'order_items', 'suppliers',
    'products', 'deliveries', 'payments', 'disputes'
  ];

  for (const tableName of criticalTables) {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT COUNT(*) as policy_count
        FROM pg_policies
        WHERE tablename = '${tableName}';
      `
    }).catch(() => ({ data: null, error: 'Not available' }));

    if (data && data[0]) {
      console.log(`  ${tableName}: ${data[0].policy_count} policies`);
    } else {
      console.log(`  ${tableName}: Unable to check`);
    }
  }

  // 7. Check enums
  console.log('\n🏷️  ENUM TYPES:\n');
  const enumTypes = ['user_role', 'order_status', 'payment_status', 'dispute_status', 'delivery_zone'];

  for (const enumType of enumTypes) {
    const { data } = await supabase.rpc('exec_sql', {
      query: `
        SELECT enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = '${enumType}'
        ORDER BY e.enumsortorder;
      `
    }).catch(() => ({ data: null }));

    if (data) {
      const values = data.map(d => d.enumlabel).join(', ');
      console.log(`  ✅ ${enumType}: [${values}]`);
    }
  }

  // 8. Check custom functions
  console.log('\n⚙️  CUSTOM FUNCTIONS:\n');
  const functions = [
    'fn_calculate_delivery_fee',
    'is_supplier_admin',
    'get_unread_messages_count',
    'mark_conversation_read'
  ];

  for (const funcName of functions) {
    const { data } = await supabase.rpc('exec_sql', {
      query: `
        SELECT proname
        FROM pg_proc
        WHERE proname = '${funcName}';
      `
    }).catch(() => ({ data: null }));

    if (data && data.length > 0) {
      console.log(`  ✅ ${funcName}`);
    } else {
      console.log(`  ❌ ${funcName} (not found)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Schema inspection complete!\n');
}

inspectSchema().catch(err => {
  console.error('❌ Error inspecting schema:', err.message);
  process.exit(1);
});
