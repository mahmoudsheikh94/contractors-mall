#!/bin/bash

# ================================================
# Run Comprehensive Test Data Script
# ================================================
# This script runs the comprehensive SQL test data
# script against your Supabase database.
# ================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Contractors Mall - Comprehensive Test Data${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found!${NC}"
    echo -e "${YELLOW}Please create .env.local with your Supabase credentials.${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Extract database password and URL from environment
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"
DB_URL="${SUPABASE_DB_URL}"

# Fallback to default if not set
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="5822075Mahmoud94$"
    echo -e "${YELLOW}⚠️  Using default database password${NC}"
fi

if [ -z "$DB_URL" ]; then
    DB_URL="postgresql://postgres.zbscashhrdeofvgjnbsb@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
    echo -e "${YELLOW}⚠️  Using default database URL${NC}"
fi

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}IMPORTANT: Prerequisites${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""
echo -e "${YELLOW}Before running this script, you MUST create these auth users${NC}"
echo -e "${YELLOW}via Supabase Dashboard → Authentication → Users:${NC}"
echo ""
echo -e "1. supplier1@contractors.jo / TestSupplier123!"
echo -e "2. supplier2@contractors.jo / TestSupplier123!"
echo -e "3. supplier3@contractors.jo / TestSupplier123!"
echo -e "4. contractor1@test.jo / TestPassword123!"
echo -e "5. contractor2@test.jo / TestPassword123!"
echo -e "6. driver1@test.jo / TestDriver123!"
echo -e "7. admin@contractors.jo / TestAdmin123!"
echo ""
echo -e "${YELLOW}For each user, make sure to:${NC}"
echo -e "- ✓ Auto Confirm User (check this box!)"
echo -e "- ✓ Use the exact email and password above"
echo ""
echo -e "${YELLOW}Dashboard URL:${NC}"
echo -e "https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/auth/users"
echo ""
echo -e "${YELLOW}================================================${NC}"
echo ""

# Ask for confirmation
read -p "Have you created all 7 auth users? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Aborted. Please create the auth users first.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 Running comprehensive test data script...${NC}"
echo ""

# Run the SQL script
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -f supabase/seed-comprehensive-test-data.sql

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ SUCCESS!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${GREEN}Comprehensive test data has been created:${NC}"
    echo ""
    echo -e "✓ 7 User Profiles (3 suppliers, 2 contractors, 1 driver, 1 admin)"
    echo -e "✓ 3 Suppliers with realistic business data"
    echo -e "✓ 3 Contractor Projects"
    echo -e "✓ 12 Products (2 with low stock for alert testing)"
    echo -e "✓ 15 Orders in all statuses (pending → completed/cancelled)"
    echo -e "✓ 9 Deliveries (photo proof & PIN verification)"
    echo -e "✓ 15 Payments (pending, held, released, refunded)"
    echo -e "✓ 3 Disputes (opened, investigating, resolved)"
    echo -e "✓ 4 Reviews with ratings"
    echo ""
    echo -e "${GREEN}You can now test:${NC}"
    echo -e "1. Supplier Dashboard - Login as supplier1@contractors.jo"
    echo -e "2. Contractor Portal - Login as contractor1@test.jo"
    echo -e "3. Admin Dashboard - Login as admin@contractors.jo"
    echo ""
    echo -e "${GREEN}All dashboards should now show realistic metrics!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}❌ ERROR!${NC}"
    echo -e "${RED}================================================${NC}"
    echo ""
    echo -e "${RED}Failed to run test data script.${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "1. Auth users not created - Create them via Supabase Dashboard first"
    echo -e "2. Database connection failed - Check your .env.local credentials"
    echo -e "3. Schema mismatch - Make sure all migrations are applied"
    echo ""
    echo -e "${YELLOW}Try running 'pnpm supabase db push' to apply migrations first.${NC}"
    echo ""
    exit 1
fi
