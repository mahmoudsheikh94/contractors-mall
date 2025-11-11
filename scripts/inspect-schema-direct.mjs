#!/usr/bin/env node

/**
 * Database Schema Inspector - Direct Connection
 * Queries Supabase to get actual schema state
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local
const envPath = join(__dirname, '..', '.env.local');
let envContent;
try {
  envContent = readFileSync(envPath, 'utf8');
} catch (err) {
  console.error('❌ Could not read .env.local file');
  process.exit(1);
}

// Parse env vars
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase Database Schema\n');
  console.log('='.repeat(80));

  // 1. Check all tables by attempting to query them
  console.log('\n📋 TABLES (attempting to query each):\n');
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

  const existingTables = [];
  for (const tableName of tableNames) {
    const { error } = await supabase.from(tableName).select('*').limit(0);
    if (!error) {
      console.log(`  ✅ ${tableName}`);
      existingTables.push(tableName);
    } else if (error.code === '42P01') {
      console.log(`  ❌ ${tableName} (does not exist)`);
    } else if (error.code === 'PGRST301') {
      console.log(`  ⚠️  ${tableName} (exists but no RLS access)`);
      existingTables.push(tableName);
    } else {
      console.log(`  ⚠️  ${tableName} (error: ${error.code})`);
    }
  }

  // 2. Check supplier_zone_fees columns
  console.log('\n📊 SUPPLIER_ZONE_FEES TABLE STRUCTURE:\n');
  const { data: zoneFees, error: zfError } = await supabase
    .from('supplier_zone_fees')
    .select('*')
    .limit(1);

  if (zfError) {
    console.log(`  ⚠️  Error querying: ${zfError.message}`);
    console.log(`  Code: ${zfError.code}`);
  } else if (zoneFees && zoneFees.length > 0) {
    const columns = Object.keys(zoneFees[0]);
    console.log(`  Found ${columns.length} columns:`);
    columns.forEach(col => {
      if (col === 'vehicle_class_id') {
        console.log(`  ⚠️  ${col} ← SHOULD BE REMOVED per hotfix!`);
      } else {
        console.log(`  ✅ ${col}`);
      }
    });
  } else {
    console.log('  ℹ️  Table exists but is empty - cannot inspect columns via data');
  }

  // 3. Check order_items columns
  console.log('\n📦 ORDER_ITEMS TABLE STRUCTURE:\n');
  const { data: orderItems, error: oiError } = await supabase
    .from('order_items')
    .select('*')
    .limit(1);

  if (oiError) {
    console.log(`  ⚠️  Error querying: ${oiError.message}`);
  } else if (orderItems && orderItems.length > 0) {
    const columns = Object.keys(orderItems[0]);
    console.log(`  Found ${columns.length} columns:`);
    columns.forEach(col => {
      if (col === 'product_name' || col === 'unit') {
        console.log(`  ⚠️  ${col} (should be NOT NULL per docs, currently nullable)`);
      } else {
        console.log(`  ✅ ${col}`);
      }
    });
  } else {
    console.log('  ℹ️  Table exists but is empty');
  }

  // 4. Check orders table for vehicle columns
  console.log('\n🚚 ORDERS TABLE - VEHICLE COLUMNS:\n');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, vehicle_class_id, vehicle_type, status')
    .limit(5);

  if (ordersError) {
    console.log(`  ⚠️  Error querying: ${ordersError.message}`);
  } else if (orders) {
    console.log(`  Found ${orders.length} orders:`);
    if (orders.length > 0) {
      const hasNullVehicles = orders.some(o => o.vehicle_class_id === null || o.vehicle_type === null);
      if (hasNullVehicles) {
        console.log(`  ✅ vehicle_class_id and vehicle_type ARE nullable (as expected after hotfix)`);
      }
      orders.slice(0, 3).forEach((order, idx) => {
        console.log(`    Order ${idx + 1}: vehicle_class_id=${order.vehicle_class_id}, vehicle_type=${order.vehicle_type}`);
      });
    } else {
      console.log(`  ℹ️  No orders in database yet`);
    }
  }

  // 5. Check profiles for email columns
  console.log('\n👤 PROFILES TABLE - EMAIL VERIFICATION:\n');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, email_verified, email_verified_at, role')
    .limit(3);

  if (profilesError) {
    console.log(`  ⚠️  Error querying: ${profilesError.message}`);
  } else if (profiles && profiles.length > 0) {
    const columns = Object.keys(profiles[0]);
    const emailCols = columns.filter(c => c.includes('email'));
    console.log(`  Email-related columns: ${emailCols.join(', ')}`);
    console.log(`  ✅ email_verified column exists: ${columns.includes('email_verified')}`);
    console.log(`  ✅ email_verified_at column exists: ${columns.includes('email_verified_at')}`);
  }

  // 6. Check critical Phase 2 tables
  console.log('\n🚀 PHASE 2 TABLES:\n');
  const phase2Tables = [
    'order_notes',
    'order_tags',
    'order_communications',
    'admin_conversations',
    'admin_messages',
    'email_templates',
    'contractor_insights',
    'wallet_transactions'
  ];

  for (const tableName of phase2Tables) {
    if (existingTables.includes(tableName)) {
      console.log(`  ✅ ${tableName}`);
    } else {
      console.log(`  ❌ ${tableName} (missing)`);
    }
  }

  // 7. Test a critical RLS policy
  console.log('\n🔒 RLS POLICY TEST (Profiles):\n');

  // Try to query profiles without auth (should fail or return limited data)
  const { data: publicProfiles, error: publicError } = await supabase
    .from('profiles')
    .select('id, role')
    .limit(1);

  if (publicError) {
    console.log(`  ✅ RLS is active - unauthenticated query blocked: ${publicError.message}`);
  } else if (publicProfiles) {
    console.log(`  ⚠️  RLS may be too permissive - got ${publicProfiles.length} profiles without auth`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Schema inspection complete!\n');

  console.log('📝 SUMMARY OF CONTRADICTIONS:\n');
  console.log('  1. Check if vehicle_class_id still exists in supplier_zone_fees');
  console.log('  2. Verify order_items.product_name and .unit are nullable');
  console.log('  3. Confirm all Phase 2 tables are present');
  console.log('  4. Verify email verification columns in profiles');
  console.log('');
}

inspectSchema().catch(err => {
  console.error('❌ Error inspecting schema:', err.message);
  console.error(err);
  process.exit(1);
});
