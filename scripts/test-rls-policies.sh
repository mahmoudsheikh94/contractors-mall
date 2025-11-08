#!/bin/bash

# ============================================================================
# RLS Policy Test Runner
# ============================================================================
# Runs the RLS policy test suite against the Supabase database
# ============================================================================

set -e

echo "🧪 Running RLS Policy Tests..."
echo ""

# Get the project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "📋 Test Suite:"
echo "   1. Basic RLS Structure Tests"
echo "   2. Functional RLS Policy Tests"
echo ""

# Run basic structure tests
echo -e "${YELLOW}Running basic RLS structure tests...${NC}"
if npx supabase db execute < supabase/tests/rls_policies.test.sql 2>&1 | grep -q "PASS"; then
    echo -e "${GREEN}✅ Structure tests passed${NC}"
else
    echo -e "${RED}❌ Structure tests failed${NC}"
fi

echo ""

# Run functional tests
echo -e "${YELLOW}Running functional RLS policy tests...${NC}"
npx supabase db execute < supabase/tests/rls_functional.test.sql

echo ""
echo "✅ RLS policy tests complete!"
