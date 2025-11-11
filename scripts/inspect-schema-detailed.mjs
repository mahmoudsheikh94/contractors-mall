#!/usr/bin/env node

/**
 * Detailed Schema Inspector
 * Gets column definitions, constraints, and RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (need service key for schema inspection)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectDetailed() {
  console.log('🔬 DETAILED SCHEMA INSPECTION\n');
  console.log('='.repeat(80));

  // 1. Get supplier_zone_fees structure
  console.log('\n📊 SUPPLIER_ZONE_FEES - Column Definitions:\n');

  const { data: szfColumns, error: szfError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'supplier_zone_fees'
      ORDER BY ordinal_position;
    `
  }).catch(e => ({ data: null, error: e.message }));

  if (szfColumns) {
    szfColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      if (col.column_name === 'vehicle_class_id') {
        console.log(`  ⚠️  ${col.column_name}: ${col.data_type} ${nullable} ← SHOULD BE REMOVED!`);
      } else {
        console.log(`  ✅ ${col.column_name}: ${col.data_type} ${nullable}`);
      }
    });
  } else {
    console.log(`  ⚠️  Could not query column info: ${szfError || 'RPC not available'}`);
  }

  // 2. Check supplier_zone_fees constraints
  console.log('\n🔗 SUPPLIER_ZONE_FEES - Constraints:\n');

  const { data: szfConstraints } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'supplier_zone_fees'::regclass;
    `
  }).catch(() => ({ data: null }));

  if (szfConstraints) {
    szfConstraints.forEach(c => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'u': 'UNIQUE',
        'c': 'CHECK'
      }[c.constraint_type] || c.constraint_type;

      console.log(`  ${type}: ${c.constraint_name}`);
      console.log(`    ${c.definition}`);
    });
  }

  // 3. Get order_items structure with nullability
  console.log('\n📦 ORDER_ITEMS - Column Nullability:\n');

  const { data: oiColumns } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'order_items'
        AND column_name IN ('product_name', 'unit', 'product_id', 'quantity')
      ORDER BY ordinal_position;
    `
  }).catch(() => ({ data: null }));

  if (oiColumns) {
    oiColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL';
      if ((col.column_name === 'product_name' || col.column_name === 'unit') && col.is_nullable === 'YES') {
        console.log(`  ⚠️  ${col.column_name}: ${col.data_type} - ${nullable} (TEMPORARY per hotfix)`);
      } else {
        console.log(`  ✅ ${col.column_name}: ${col.data_type} - ${nullable}`);
      }
    });
  }

  // 4. Check RLS policies on critical tables
  console.log('\n🔒 RLS POLICIES - Critical Tables:\n');

  const criticalTables = ['profiles', 'orders', 'order_items', 'supplier_zone_fees'];

  for (const tableName of criticalTables) {
    const { data: policies } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          policyname,
          cmd as command,
          qual as using_expression
        FROM pg_policies
        WHERE tablename = '${tableName}'
        ORDER BY policyname;
      `
    }).catch(() => ({ data: null }));

    if (policies && policies.length > 0) {
      console.log(`\n  📋 ${tableName.toUpperCase()} (${policies.length} policies):`);
      policies.forEach(p => {
        console.log(`    • ${p.policyname} [${p.command}]`);
      });
    } else {
      console.log(`\n  ⚠️  ${tableName.toUpperCase()}: No policies found or unable to query`);
    }
  }

  // 5. Check custom enum types
  console.log('\n\n🏷️  ENUM TYPES - Values:\n');

  const enumTypes = ['user_role', 'order_status', 'payment_status', 'delivery_zone'];

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
      const values = data.map(d => d.enumlabel);
      console.log(`  ✅ ${enumType}:`);
      values.forEach(v => console.log(`     - ${v}`));
    }
  }

  // 6. Check for deprecated migration file
  console.log('\n\n🗑️  DEPRECATED MIGRATION FILES:\n');

  const { readdir } = await import('fs/promises');
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const files = await readdir(migrationsDir);

  const deprecatedFiles = files.filter(f =>
    f.includes('DEPRECATED') ||
    f.includes('deprecated') ||
    f.includes('old') ||
    f.includes('backup')
  );

  if (deprecatedFiles.length > 0) {
    deprecatedFiles.forEach(f => console.log(`  ⚠️  ${f}`));
  } else {
    console.log('  ✅ No deprecated migration files found');
  }

  // 7. Check custom database functions
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
        SELECT
          proname as name,
          pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = '${funcName}';
      `
    }).catch(() => ({ data: null }));

    if (data && data.length > 0) {
      console.log(`  ✅ ${funcName} exists`);
    } else {
      console.log(`  ❌ ${funcName} not found`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Detailed inspection complete!\n');
}

inspectDetailed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
