#!/bin/bash

# Contractors Mall - Automated Supabase Deployment Script
# This script handles migrations, storage buckets, and initial setup

set -e  # Exit on error

PROJECT_REF="zbscashhrdeofvgjnbsb"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Contractors Mall - Supabase Deployment"
echo "=========================================="
echo ""

# Check if logged in to Supabase
echo "📋 Step 1/4: Checking Supabase CLI authentication..."
if ! npx supabase projects list >/dev/null 2>&1; then
    echo "❌ Not logged in to Supabase CLI"
    echo "   Run: npx supabase login"
    exit 1
fi
echo "✅ Authenticated"
echo ""

# Link project if not already linked
echo "📋 Step 2/4: Linking to Supabase project..."
if ! npx supabase status 2>/dev/null | grep -q "$PROJECT_REF"; then
    echo "   Linking to project: $PROJECT_REF"
    echo "   You may be prompted for the database password: 5822075Mahmoud94$"
    npx supabase link --project-ref "$PROJECT_REF"
else
    echo "✅ Already linked to project"
fi
echo ""

# Push migrations
echo "📋 Step 3/4: Pushing database migrations..."
echo "   This will apply all migrations to your cloud database"
echo "   Answering 'Y' to confirmation prompt..."
echo ""

# Use timeout to prevent hanging
timeout 180 bash -c 'echo "Y" | npx supabase db push' || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo "⚠️  Migration push timed out after 3 minutes"
        echo "   This might indicate a connection issue."
        echo ""
        echo "   Please try manually:"
        echo "   1. npx supabase link --project-ref $PROJECT_REF"
        echo "   2. npx supabase db push"
        echo ""
        echo "   Or check the Supabase dashboard for errors:"
        echo "   https://supabase.com/dashboard/project/$PROJECT_REF/logs/postgres-logs"
        exit 1
    else
        echo "❌ Migration push failed with exit code: $EXIT_CODE"
        exit $EXIT_CODE
    fi
}

echo ""
echo "✅ Migrations applied successfully!"
echo ""

# Storage buckets (manual step - provide instructions)
echo "📋 Step 4/4: Storage Buckets Setup"
echo ""
echo "⚠️  Storage buckets must be created manually in the Supabase dashboard."
echo ""
echo "Please visit:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/storage/buckets"
echo ""
echo "Create these 3 buckets:"
echo ""
echo "1. delivery-proofs"
echo "   - Public: ❌ No (Private)"
echo "   - File size limit: 10MB"
echo "   - Allowed MIME types: image/jpeg,image/png,image/webp"
echo ""
echo "2. product-images"
echo "   - Public: ✅ Yes (Public)"
echo "   - File size limit: 5MB"
echo "   - Allowed MIME types: image/jpeg,image/png,image/webp"
echo ""
echo "3. dispute-media"
echo "   - Public: ❌ No (Private)"
echo "   - File size limit: 10MB"
echo "   - Allowed MIME types: image/jpeg,image/png,image/webp,application/pdf"
echo ""
echo "=========================================="
echo "✅ Supabase deployment complete!"
echo ""
echo "Next steps:"
echo "1. Create storage buckets (see above)"
echo "2. Configure Auth URLs in Supabase dashboard"
echo "3. Deploy to Vercel: ./scripts/deploy-vercel.sh"
echo ""
