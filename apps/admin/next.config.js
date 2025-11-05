/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@contractors-mall/ui'],
  images: {
    domains: ['localhost', 'supabase.co'],
  },
}

module.exports = nextConfig