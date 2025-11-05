#!/bin/bash

# ===========================================
# Contractors Mall - Deployment Setup Script
# ===========================================
# This script helps you set up the necessary
# secrets for GitHub Actions deployment
# ===========================================

echo "🚀 Contractors Mall - Deployment Setup"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI found${NC}"
echo ""

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to GitHub${NC}"
    echo "Running: gh auth login"
    gh auth login
fi

echo ""
echo "📝 Setting up GitHub Secrets"
echo "============================"
echo ""

# Function to set secret
set_secret() {
    local name=$1
    local prompt=$2
    local value=$3

    if [ -z "$value" ]; then
        read -p "$prompt: " value
    fi

    if [ -n "$value" ]; then
        echo "$value" | gh secret set "$name"
        echo -e "${GREEN}✅ Set secret: $name${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipped: $name${NC}"
    fi
}

echo "🔐 Supabase Configuration"
echo "------------------------"
echo "Get these from: app.supabase.com → Settings → API"
echo ""

set_secret "NEXT_PUBLIC_SUPABASE_URL" "Supabase Project URL (https://xxx.supabase.co)"
set_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase Anon Key"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Role Key (keep secret!)"
set_secret "SUPABASE_PROJECT_ID" "Supabase Project ID (xxx from URL)"
set_secret "SUPABASE_DB_PASSWORD" "Supabase Database Password"
set_secret "SUPABASE_ACCESS_TOKEN" "Supabase Access Token (for CLI)"

echo ""
echo "🗺️ Mapbox Configuration"
echo "----------------------"
echo "Get from: mapbox.com → Account → Tokens"
echo ""

set_secret "NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN" "Mapbox Public Token"

echo ""
echo "▲ Vercel Configuration"
echo "---------------------"
echo "Get from: vercel.com → Account Settings → Tokens"
echo ""

set_secret "VERCEL_TOKEN" "Vercel Token"
set_secret "VERCEL_ORG_ID" "Vercel Organization ID"
set_secret "VERCEL_PROJECT_ID_ADMIN" "Vercel Project ID for Admin App"
set_secret "VERCEL_PROJECT_ID_WEB" "Vercel Project ID for Web App"

echo ""
echo "📧 Optional: Email Configuration"
echo "-------------------------------"
echo "For email features (can skip for Alpha)"
echo ""

read -p "Configure email settings? (y/n): " configure_email
if [ "$configure_email" = "y" ]; then
    set_secret "RESEND_API_KEY" "Resend API Key (from resend.com)"
fi

echo ""
echo "📊 Optional: Monitoring"
echo "----------------------"
echo "For error tracking (can skip for Alpha)"
echo ""

read -p "Configure monitoring? (y/n): " configure_monitoring
if [ "$configure_monitoring" = "y" ]; then
    set_secret "SENTRY_DSN" "Sentry DSN"
    set_secret "SENTRY_AUTH_TOKEN" "Sentry Auth Token"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next Steps:"
echo "1. Commit and push your code to GitHub"
echo "2. Go to Vercel and import your repository"
echo "3. The GitHub Actions will run automatically on push to main"
echo ""
echo "To verify secrets were set:"
echo "  gh secret list"
echo ""
echo "To manually trigger deployment:"
echo "  gh workflow run deploy.yml"
echo ""
echo "Good luck with your deployment! 🚀"