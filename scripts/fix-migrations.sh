#!/bin/bash
# Quick fix to apply only the email verification migration

set -e

echo "🔧 Applying email verification migration..."
echo ""

# This migration is safe because it uses IF NOT EXISTS
# It only adds email_verified and email_verified_at columns

npx supabase link --project-ref zbscashhrdeofvgjnbsb

# Apply only the specific migrations we need
npx supabase db execute --file supabase/migrations/20251031_add_email_verification.sql --linked

echo ""
echo "✅ Email verification columns added!"
echo ""
echo "Now regenerating types..."
export SUPABASE_PROJECT_ID=zbscashhrdeofvgjnbsb
./scripts/generate-types.sh
