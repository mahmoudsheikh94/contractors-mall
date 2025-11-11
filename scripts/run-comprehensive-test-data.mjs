#!/usr/bin/env node

/**
 * Run Comprehensive Test Data Script (Node.js version)
 * This script runs the comprehensive SQL test data script using Supabase client
 * Use this if you don't have psql installed
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const envPath = resolve(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main() {
  console.log(`${colors.blue}================================================${colors.reset}`)
  console.log(`${colors.blue}Contractors Mall - Comprehensive Test Data${colors.reset}`)
  console.log(`${colors.blue}================================================${colors.reset}`)
  console.log('')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log('red', '❌ Error: Missing Supabase credentials!')
    log('yellow', 'Make sure .env.local has:')
    log('yellow', '- NEXT_PUBLIC_SUPABASE_URL')
    log('yellow', '- SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log(`${colors.yellow}================================================${colors.reset}`)
  console.log(`${colors.yellow}IMPORTANT: Prerequisites${colors.reset}`)
  console.log(`${colors.yellow}================================================${colors.reset}`)
  console.log('')
  console.log(`${colors.yellow}Make sure you've created these auth users via Supabase Dashboard:${colors.reset}`)
  console.log('')
  console.log('1. supplier1@contractors.jo / TestSupplier123!')
  console.log('2. supplier2@contractors.jo / TestSupplier123!')
  console.log('3. supplier3@contractors.jo / TestSupplier123!')
  console.log('4. contractor1@test.jo / TestPassword123!')
  console.log('5. contractor2@test.jo / TestPassword123!')
  console.log('6. driver1@test.jo / TestDriver123!')
  console.log('7. admin@contractors.jo / TestAdmin123!')
  console.log('')
  console.log(`${colors.yellow}Dashboard URL:${colors.reset}`)
  console.log('https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/auth/users')
  console.log('')
  console.log(`${colors.yellow}================================================${colors.reset}`)
  console.log('')

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  log('blue', '🚀 Reading comprehensive test data SQL script...')
  console.log('')

  // Read the SQL file
  const sqlPath = resolve(__dirname, '..', 'supabase', 'seed-comprehensive-test-data.sql')
  let sqlContent

  try {
    sqlContent = readFileSync(sqlPath, 'utf8')
  } catch (error) {
    log('red', `❌ Error reading SQL file: ${error.message}`)
    process.exit(1)
  }

  log('blue', '📤 Executing SQL script via Supabase...')
  console.log('')

  // Execute the SQL
  // Note: Supabase client doesn't directly support executing raw SQL files
  // We'll use the REST API with the SQL endpoint
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })

    if (error) {
      // If the function doesn't exist, we need to use a different approach
      if (error.code === '42883') {
        log('yellow', '⚠️  Direct SQL execution not available via Supabase client.')
        log('yellow', '')
        log('yellow', 'Please use ONE of these alternatives:')
        log('yellow', '')
        log('yellow', '1. Install PostgreSQL client (RECOMMENDED):')
        log('yellow', '   brew install postgresql@16')
        log('yellow', '   Then run: pnpm db:seed-comprehensive')
        log('yellow', '')
        log('yellow', '2. Use Supabase Dashboard SQL Editor:')
        log('yellow', '   a. Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/sql')
        log('yellow', '   b. Open file: supabase/seed-comprehensive-test-data.sql')
        log('yellow', '   c. Copy all contents')
        log('yellow', '   d. Paste in SQL Editor')
        log('yellow', '   e. Click "Run"')
        log('yellow', '')
        log('yellow', '3. Use psql directly (if installed elsewhere):')
        log('yellow', '   PGPASSWORD="5822075Mahmoud94$" psql \\')
        log('yellow', '   "postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres" \\')
        log('yellow', '   -f supabase/seed-comprehensive-test-data.sql')
        log('yellow', '')
        process.exit(1)
      } else {
        throw error
      }
    }

    console.log('')
    log('green', '================================================')
    log('green', '✅ SUCCESS!')
    log('green', '================================================')
    console.log('')
    log('green', 'Comprehensive test data has been created:')
    console.log('')
    console.log('✓ 7 User Profiles (3 suppliers, 2 contractors, 1 driver, 1 admin)')
    console.log('✓ 3 Suppliers with realistic business data')
    console.log('✓ 3 Contractor Projects')
    console.log('✓ 12 Products (2 with low stock for alert testing)')
    console.log('✓ 15 Orders in all statuses (pending → completed/cancelled)')
    console.log('✓ 9 Deliveries (photo proof & PIN verification)')
    console.log('✓ 15 Payments (pending, held, released, refunded)')
    console.log('✓ 3 Disputes (opened, investigating, resolved)')
    console.log('✓ 4 Reviews with ratings')
    console.log('')
    log('green', 'You can now test:')
    console.log('1. Supplier Dashboard - Login as supplier1@contractors.jo')
    console.log('2. Contractor Portal - Login as contractor1@test.jo')
    console.log('3. Admin Dashboard - Login as admin@contractors.jo')
    console.log('')
    log('green', 'All dashboards should now show realistic metrics!')
    console.log('')

  } catch (error) {
    console.log('')
    log('red', '================================================')
    log('red', '❌ ERROR!')
    log('red', '================================================')
    console.log('')
    log('red', `Failed to run test data script: ${error.message}`)
    console.log('')
    log('yellow', 'Common issues:')
    console.log('1. Auth users not created - Create them via Supabase Dashboard first')
    console.log('2. Database connection failed - Check your .env.local credentials')
    console.log('3. Schema mismatch - Make sure all migrations are applied')
    console.log('')
    log('yellow', "Try using Supabase Dashboard SQL Editor as an alternative (see above)")
    console.log('')
    process.exit(1)
  }
}

main().catch(error => {
  log('red', `Unexpected error: ${error.message}`)
  process.exit(1)
})
