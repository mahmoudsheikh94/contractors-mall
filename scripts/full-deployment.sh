#!/bin/bash

# Contractors Mall - Complete Automated Deployment
# This script handles everything: Git, GitHub, Supabase, and Vercel

set -e

echo "🚀 Contractors Mall - Full Automated Deployment"
echo "================================================"
echo ""
echo "This script will:"
echo "  ✅ Push code to GitHub (if needed)"
echo "  ✅ Deploy database to Supabase"
echo "  ✅ Deploy apps to Vercel"
echo "  ✅ Configure automatic deployments"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Step 1: Ensure latest code is on GitHub
echo ""
echo "=========================================="
echo "📦 Step 1/3: Syncing with GitHub"
echo "=========================================="
echo ""

if git diff-index --quiet HEAD --; then
    echo "✅ No uncommitted changes"
else
    echo "📝 Committing latest changes..."
    git add .
    git commit -m "Deployment updates $(date +%Y-%m-%d)"
fi

echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Code synced to GitHub"

# Step 2: Deploy Supabase
echo ""
echo "=========================================="
echo "📦 Step 2/3: Deploying to Supabase"
echo "=========================================="
echo ""

./scripts/deploy-supabase.sh

# Step 3: Deploy Vercel
echo ""
echo "=========================================="
echo "📦 Step 3/3: Deploying to Vercel"
echo "=========================================="
echo ""

./scripts/deploy-vercel.sh

# Final Summary
echo ""
echo "================================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "✅ All systems are live and ready for Alpha testing"
echo ""
echo "📋 Final Checklist:"
echo ""
echo "  [ ] Storage buckets created in Supabase"
echo "  [ ] Auth redirect URLs configured"
echo "  [ ] Admin portal accessible"
echo "  [ ] Web app accessible"
echo "  [ ] Can register new supplier account"
echo "  [ ] Can create products"
echo ""
echo "🔗 Important Links:"
echo "  - GitHub: https://github.com/mahmoudsheikh94/contractors-mall"
echo "  - Supabase: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb"
echo "  - Vercel: https://vercel.com/dashboard"
echo ""
echo "📚 Documentation:"
echo "  - QUICK_START.md - Quick start guide"
echo "  - DEPLOYMENT.md - Full deployment documentation"
echo "  - SUPABASE_SETUP.md - Supabase configuration guide"
echo ""
