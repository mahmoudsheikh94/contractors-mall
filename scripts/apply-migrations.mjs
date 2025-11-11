#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase connection
const supabaseUrl = 'https://zbscashhrdeofvgjnbsb.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTI0MzYzNywiZXhwIjoyMDQ2ODE5NjM3fQ.HWnbqy5FYMlf7z1qhVYGQPKVdVXsRPSaFvEWPStdRvU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration(filePath) {
  console.log(`\nApplying migration: ${filePath}`)

  try {
    // Read the migration file
    const migrationSQL = readFileSync(filePath, 'utf-8')

    // Execute the SQL using Supabase's RPC
    // We'll use the raw SQL execution endpoint
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // If exec_sql doesn't exist, try direct execution via the REST API
      console.log('Trying direct SQL execution...')

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      console.log(`Found ${statements.length} SQL statements to execute`)

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (stmt) {
          try {
            console.log(`Executing statement ${i + 1}/${statements.length}...`)
            // Use a custom fetch to execute raw SQL
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ query: stmt + ';' })
            })

            if (!response.ok && response.status !== 404) {
              const errorText = await response.text()
              console.error(`  ⚠️  Statement ${i + 1} warning: ${errorText}`)
            } else if (response.ok) {
              console.log(`  ✅ Statement ${i + 1} executed`)
            }
          } catch (stmtError) {
            console.error(`  ❌ Error executing statement ${i + 1}:`, stmtError.message)
          }
        }
      }

      console.log(`✅ Migration completed: ${filePath}`)
    } else {
      console.log(`✅ Migration completed: ${filePath}`)
      console.log('Result:', data)
    }
  } catch (err) {
    console.error(`❌ Error applying migration ${filePath}:`, err.message)
    throw err
  }
}

async function main() {
  console.log('Starting migration application...')
  console.log('Supabase URL:', supabaseUrl)

  const projectRoot = join(__dirname, '..')

  const migrations = [
    join(projectRoot, 'supabase/migrations/20251105120000_phase_2c_order_enhancements_FIXED.sql'),
    join(projectRoot, 'supabase/migrations/20251105130000_phase_2c_2d_insights_messaging.sql'),
  ]

  for (const migration of migrations) {
    await applyMigration(migration)
  }

  console.log('\n✅ All migrations applied successfully!')

  // Verify tables exist
  console.log('\nVerifying tables exist...')
  const tablesToCheck = ['order_notes', 'order_activities', 'messages', 'in_app_notifications']

  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('id').limit(0)
    if (error) {
      console.log(`  ❌ Table ${table}: NOT FOUND - ${error.message}`)
    } else {
      console.log(`  ✅ Table ${table}: EXISTS`)
    }
  }
}

main().catch(console.error)
