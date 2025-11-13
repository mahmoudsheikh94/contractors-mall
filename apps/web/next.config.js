/** @type {import('next').NextConfig} */

// Validate required environment variables at build time
const requiredEnvVars = {
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

// Log environment variable status (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Environment Variables Check:')
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      console.warn(`  ⚠️ ${key} is missing`)
    } else {
      console.log(`  ✅ ${key} is configured (${value.substring(0, 10)}...)`)
    }
  })
}

// Warn if critical variables are missing
if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
  console.warn('\n⚠️ WARNING: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set!')
  console.warn('Maps will not work without this token.')
  console.warn('Add it to .env.local or set it in your deployment environment.\n')
}

const nextConfig = {
  transpilePackages: ['@contractors-mall/ui'],
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  // Note: env variables are automatically passed to the app
  // No need to manually pass them here
}

module.exports = nextConfig