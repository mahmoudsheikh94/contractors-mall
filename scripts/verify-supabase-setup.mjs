#!/usr/bin/env node

/**
 * Verify Supabase Configuration
 * Tests all required environment variables and connections
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

function header(title) {
  console.log('')
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.blue}${title}${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log('')
}

async function main() {
  header('SUPABASE CONFIGURATION VERIFICATION')

  let hasErrors = false

  // Step 1: Check .env.local exists
  console.log('📄 Checking for .env.local file...')
  try {
    readFileSync(envPath, 'utf8')
    log('green', '  ✅ .env.local found')
  } catch (error) {
    log('red', '  ❌ .env.local not found!')
    log('yellow', '  → Create .env.local in project root')
    hasErrors = true
    return
  }

  // Step 2: Check required environment variables
  header('ENVIRONMENT VARIABLES CHECK')

  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': {
      name: 'Project URL',
      example: 'https://zbscashhrdeofvgjnbsb.supabase.co',
      required: true
    },
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
      name: 'Anon/Public Key',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      required: true
    },
    'SUPABASE_SERVICE_ROLE_KEY': {
      name: 'Service Role Key (PRIVATE)',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      required: true
    },
    'SUPABASE_DB_PASSWORD': {
      name: 'Database Password',
      example: 'your-database-password',
      required: false
    },
    'SUPABASE_DB_URL': {
      name: 'Database Connection URL',
      example: 'postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
      required: false
    }
  }

  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName]

    if (!value) {
      if (config.required) {
        log('red', `  ❌ ${varName} - MISSING (${config.name})`)
        log('yellow', `     → Add this to .env.local`)
        log('yellow', `     → Example: ${varName}=${config.example}`)
        hasErrors = true
      } else {
        log('yellow', `  ⚠️  ${varName} - Optional (${config.name})`)
        log('yellow', `     → Recommended for SQL scripts`)
      }
    } else {
      // Validate format
      if (varName.includes('URL')) {
        if (varName.includes('DB_URL')) {
          // Database URL should start with postgresql://
          if (!value.startsWith('postgresql://')) {
            log('red', `  ❌ ${varName} - Invalid format (should start with postgresql://)`)
            hasErrors = true
          } else {
            log('green', `  ✅ ${varName} - OK`)
            const masked = value.replace(/:([^@]+)@/, ':****@') // Mask password
            console.log(`     ${masked}`)
          }
        } else {
          // Project URL should start with https://
          if (!value.startsWith('http')) {
            log('red', `  ❌ ${varName} - Invalid format (should start with https://)`)
            hasErrors = true
          } else {
            log('green', `  ✅ ${varName} - OK`)
            console.log(`     ${value}`)
          }
        }
      } else if (varName.includes('KEY')) {
        if (!value.startsWith('eyJ')) {
          log('red', `  ❌ ${varName} - Invalid format (should start with eyJ)`)
          hasErrors = true
        } else {
          const preview = value.substring(0, 20) + '...' + value.substring(value.length - 10)
          log('green', `  ✅ ${varName} - OK`)
          console.log(`     ${preview}`)
        }
      } else {
        log('green', `  ✅ ${varName} - Set`)
      }
    }
  }

  // Step 3: Test Supabase Connection
  if (!hasErrors) {
    header('SUPABASE CONNECTION TEST')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('🔌 Testing connection with service role key...')

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      // Test 1: Count profiles
      const { data: profileData, error: profileError, count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (profileError) {
        log('red', '  ❌ Failed to query profiles table')
        log('red', `     Error: ${profileError.message}`)
        hasErrors = true
      } else {
        log('green', `  ✅ Profiles table accessible (${profileCount} profiles)`)
      }

      // Test 2: Count suppliers
      const { count: supplierCount, error: supplierError } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })

      if (supplierError) {
        log('red', '  ❌ Failed to query suppliers table')
        log('red', `     Error: ${supplierError.message}`)
        hasErrors = true
      } else {
        log('green', `  ✅ Suppliers table accessible (${supplierCount} suppliers)`)
      }

      // Test 3: Count orders
      const { count: orderCount, error: orderError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      if (orderError) {
        log('red', '  ❌ Failed to query orders table')
        log('red', `     Error: ${orderError.message}`)
        hasErrors = true
      } else {
        log('green', `  ✅ Orders table accessible (${orderCount} orders)`)
      }

      // Test 4: Check test users exist
      const { data: testUsers, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['supplier_admin', 'contractor', 'admin'])

      if (userError) {
        log('yellow', '  ⚠️  Could not check test users')
      } else if (testUsers && testUsers.length > 0) {
        log('green', `  ✅ Found ${testUsers.length} test users`)
        testUsers.forEach(user => {
          console.log(`     - ${user.full_name} (${user.role})`)
        })
      } else {
        log('yellow', '  ⚠️  No test users found - run test data script')
      }

    } catch (error) {
      log('red', '  ❌ Connection failed!')
      log('red', `     Error: ${error.message}`)
      hasErrors = true
    }
  }

  // Step 4: Summary
  header('SUMMARY')

  if (hasErrors) {
    log('red', '❌ CONFIGURATION HAS ERRORS')
    console.log('')
    log('yellow', '📖 Please follow the setup guide:')
    console.log('   → Read: SUPABASE_TOKEN_SETUP.md')
    console.log('   → Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/settings/api')
    console.log('   → Copy your keys to .env.local')
    console.log('')
    process.exit(1)
  } else {
    log('green', '✅ ALL CHECKS PASSED!')
    console.log('')
    log('green', 'Your Supabase configuration is correct!')
    console.log('')
    console.log('Next steps:')
    console.log('  1. ✅ Configuration verified')
    console.log('  2. 🚀 Run test data: pnpm db:seed-comprehensive')
    console.log('  3. 🧪 Start testing the application')
    console.log('')
    process.exit(0)
  }
}

main().catch(error => {
  log('red', `Unexpected error: ${error.message}`)
  process.exit(1)
})
