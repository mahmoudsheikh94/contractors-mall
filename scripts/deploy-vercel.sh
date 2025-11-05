#!/bin/bash

# Contractors Mall - Automated Vercel Deployment Script
# This script sets up both admin and web apps on Vercel with automatic deployments

set -e

PROJECT_REF="zbscashhrdeofvgjnbsb"
GITHUB_REPO="mahmoudsheikh94/contractors-mall"

echo "🚀 Contractors Mall - Vercel Deployment Setup"
echo "=============================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    source .env.local
fi

echo "📋 This script will help you deploy both apps to Vercel"
echo ""
echo "Two projects will be created:"
echo "  1. contractors-mall-admin (Admin Portal)"
echo "  2. contractors-mall-web (Contractor App)"
echo ""

# Deploy Admin Portal
echo "=========================================="
echo "📱 Deploying Admin Portal"
echo "=========================================="
echo ""

cd apps/admin

echo "🔧 Setting up Vercel project..."
echo ""
echo "When prompted:"
echo "  - Set up and deploy? Yes"
echo "  - Which scope? Select your account"
echo "  - Link to existing project? No"
echo "  - Project name: contractors-mall-admin"
echo "  - Directory: apps/admin"
echo "  - Override settings? No"
echo ""

# Run Vercel deployment
vercel --prod

# Get the project URL
ADMIN_URL=$(vercel ls 2>/dev/null | grep contractors-mall-admin | head -1 | awk '{print $2}')
echo ""
echo "✅ Admin Portal deployed!"
echo "   URL: $ADMIN_URL"
echo ""

# Set environment variables
echo "🔐 Setting environment variables for Admin Portal..."
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<EOF
https://$PROJECT_REF.supabase.co
EOF

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<EOF
${NEXT_PUBLIC_SUPABASE_ANON_KEY}
EOF

vercel env add SUPABASE_SERVICE_ROLE_KEY production <<EOF
${SUPABASE_SERVICE_ROLE_KEY}
EOF

cd ../..

echo ""
echo "=========================================="
echo "🌐 Deploying Web App"
echo "=========================================="
echo ""

cd apps/web

echo "🔧 Setting up Vercel project..."
echo ""
echo "When prompted:"
echo "  - Set up and deploy? Yes"
echo "  - Which scope? Select your account"
echo "  - Link to existing project? No"
echo "  - Project name: contractors-mall-web"
echo "  - Directory: apps/web"
echo "  - Override settings? No"
echo ""

# Run Vercel deployment
vercel --prod

# Get the project URL
WEB_URL=$(vercel ls 2>/dev/null | grep contractors-mall-web | head -1 | awk '{print $2}')
echo ""
echo "✅ Web App deployed!"
echo "   URL: $WEB_URL"
echo ""

# Set environment variables
echo "🔐 Setting environment variables for Web App..."
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<EOF
https://$PROJECT_REF.supabase.co
EOF

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<EOF
${NEXT_PUBLIC_SUPABASE_ANON_KEY}
EOF

cd ../..

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🎉 Your apps are live:"
echo ""
echo "  Admin Portal: $ADMIN_URL"
echo "  Web App:      $WEB_URL"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Update Supabase Auth URLs:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/auth/url-configuration"
echo ""
echo "   Add these redirect URLs:"
echo "   - $ADMIN_URL/**"
echo "   - $WEB_URL/**"
echo "   - http://localhost:3001/**"
echo "   - http://localhost:3000/**"
echo ""
echo "2. Test your deployment:"
echo "   - Visit $ADMIN_URL and register a supplier account"
echo "   - Visit $WEB_URL and browse products"
echo ""
echo "3. Enable automatic deployments:"
echo "   Vercel will auto-deploy on every push to 'main' branch"
echo ""
echo "🔗 Vercel Dashboard:"
echo "   https://vercel.com/dashboard"
echo ""
