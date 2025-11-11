#!/usr/bin/env node

import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database connection config
const connectionString = 'postgresql://postgres.zbscashhrdeofvgjnbsb:5822075Mahmoud94$@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'

async function applyMigration(client, filePath) {
  console.log(`\n📄 Applying migration: ${filePath}`)

  try {
    // Read the migration file
    const migrationSQL = readFileSync(filePath, 'utf-8')

    // Execute the SQL
    await client.query(migrationSQL)

    console.log(`✅ Migration applied successfully: ${filePath}\n`)
  } catch (err) {
    console.error(`❌ Error applying migration ${filePath}:`)
    console.error(err.message)
    if (err.detail) console.error('Detail:', err.detail)
    if (err.hint) console.error('Hint:', err.hint)
    throw err
  }
}

async function verifyTable(client, tableName) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `, [tableName])

    return result.rows[0].exists
  } catch (err) {
    console.error(`Error checking table ${tableName}:`, err.message)
    return false
  }
}

async function main() {
  const client = new Client({ connectionString })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully!\n')

    const projectRoot = join(__dirname, '..')

    const migrations = [
      {
        name: 'Phase 2C - Order Enhancements',
        path: join(projectRoot, 'supabase/migrations/20251105120000_phase_2c_order_enhancements_FIXED.sql')
      },
      {
        name: 'Phase 2C/2D - Insights & Messaging',
        path: join(projectRoot, 'supabase/migrations/20251105130000_phase_2c_2d_insights_messaging.sql')
      }
    ]

    console.log('📦 Applying migrations...\n')

    for (const migration of migrations) {
      console.log(`--- ${migration.name} ---`)
      await applyMigration(client, migration.path)
    }

    console.log('\n✅ All migrations applied successfully!\n')

    // Verify tables exist
    console.log('🔍 Verifying tables...\n')
    const tablesToCheck = [
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

    for (const table of tablesToCheck) {
      const exists = await verifyTable(client, table)
      const status = exists ? '✅' : '❌'
      console.log(`  ${status} ${table}`)
    }

    // Verify views
    console.log('\n🔍 Verifying views...\n')
    const viewsToCheck = [
      'customer_order_stats',
      'contractor_insights',
      'contractor_category_preferences'
    ]

    for (const view of viewsToCheck) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [view])

      const exists = result.rows[0].exists
      const status = exists ? '✅' : '❌'
      console.log(`  ${status} ${view}`)
    }

    console.log('\n🎉 Migration process complete!')

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n👋 Database connection closed')
  }
}

main()
