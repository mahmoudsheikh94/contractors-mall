#!/usr/bin/env node

import pg from 'pg'

const { Client } = pg

const connectionString = 'postgresql://postgres.zbscashhrdeofvgjnbsb:5822075Mahmoud94$@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'

async function main() {
  const client = new Client({ connectionString })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected!\n')

    // Check for tables
    console.log('📋 Checking tables from Phase 2C migrations:\n')
    const tables = [
      'order_notes',
      'order_activities',
      'order_tags',
      'order_tag_assignments',
      'messages',
      'message_attachments',
      'in_app_notifications',
      'notification_preferences',
      'email_queue',
      'contractor_communications'
    ]

    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table])

      const exists = result.rows[0].exists
      const status = exists ? '✅ EXISTS' : '❌ MISSING'
      console.log(`  ${status}: ${table}`)

      // If exists, check row count
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`)
        console.log(`           (${countResult.rows[0].count} rows)`)
      }
    }

    // Check foreign key relationships
    console.log('\n🔗 Checking foreign key relationships:\n')

    const relationships = [
      { table: 'order_notes', column: 'created_by', ref_table: 'profiles' },
      { table: 'order_activities', column: 'created_by', ref_table: 'profiles' },
      { table: 'messages', column: 'sender_id', ref_table: 'profiles' },
      { table: 'in_app_notifications', column: 'user_id', ref_table: 'profiles' },
    ]

    for (const rel of relationships) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = $1
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.column_name = $2
        );
      `, [rel.table, rel.column])

      const exists = result.rows[0].exists
      const status = exists ? '✅ EXISTS' : '❌ MISSING'
      console.log(`  ${status}: ${rel.table}.${rel.column} → ${rel.ref_table}`)
    }

    // Test PostgREST accessibility
    console.log('\n🌐 Testing PostgREST accessibility:\n')

    for (const table of ['order_notes', 'order_activities', 'messages', 'in_app_notifications']) {
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table])

      if (tableExists.rows[0].exists) {
        console.log(`  ℹ️  ${table} - Table exists in PostgreSQL`)

        // Check if RLS is enabled
        const rlsResult = await client.query(`
          SELECT relrowsecurity
          FROM pg_class
          WHERE relname = $1
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        `, [table])

        if (rlsResult.rows[0]?.relrowsecurity) {
          console.log(`     ✅ RLS enabled`)
        } else {
          console.log(`     ⚠️  RLS not enabled`)
        }
      }
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message)
  } finally {
    await client.end()
    console.log('\n👋 Done')
  }
}

main()
