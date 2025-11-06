#!/bin/bash

# Test script for dual authentication flows
# Tests both email and phone signup for suppliers and contractors

set -e

echo "=========================================="
echo "🧪 Dual Authentication Testing Suite"
echo "=========================================="
echo ""

# Load environment variables
source .env.local

# Get Supabase keys
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# Generate unique test data
TIMESTAMP=$(date +%s)
TEST_SUPPLIER_EMAIL="supplier_${TIMESTAMP}@test.com"
TEST_CONTRACTOR_EMAIL="contractor_${TIMESTAMP}@test.com"
TEST_PHONE="079${TIMESTAMP:(-7)}"  # Jordan format
FORMATTED_PHONE="+962${TEST_PHONE:1}"

echo "📋 Test Data:"
echo "  Supplier Email: $TEST_SUPPLIER_EMAIL"
echo "  Contractor Email: $TEST_CONTRACTOR_EMAIL"
echo "  Test Phone: $TEST_PHONE"
echo "  Formatted Phone: $FORMATTED_PHONE"
echo ""

# Helper function to check if profile was created
check_profile() {
    local user_id=$1
    local max_retries=10
    local retries=0

    echo "  ⏳ Waiting for profile creation..."

    while [ $retries -lt $max_retries ]; do
        response=$(curl -s \
            "${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=id,email,role,email_verified,phone_verified" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

        if echo "$response" | grep -q "\"id\":"; then
            echo "  ✅ Profile created successfully!"
            echo "  Profile: $response"
            return 0
        fi

        sleep 0.5
        ((retries++))
    done

    echo "  ❌ Profile not created after ${max_retries} retries"
    return 1
}

# Test 1: Supplier Email Signup
echo "=========================================="
echo "Test 1: Supplier Email Signup"
echo "=========================================="

echo "  📧 Signing up supplier with email..."
SUPPLIER_EMAIL_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/auth/v1/signup" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEST_SUPPLIER_EMAIL}\",
        \"password\": \"TestPassword123!\",
        \"data\": {
            \"full_name\": \"Test Supplier\",
            \"phone\": \"${TEST_PHONE}\",
            \"role\": \"supplier_admin\",
            \"signup_method\": \"email\"
        }
    }")

echo "  Response: $SUPPLIER_EMAIL_RESPONSE"

SUPPLIER_USER_ID=$(echo $SUPPLIER_EMAIL_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$SUPPLIER_USER_ID" ]; then
    echo "  ✅ Supplier created with ID: $SUPPLIER_USER_ID"
    check_profile "$SUPPLIER_USER_ID"
else
    echo "  ❌ Failed to create supplier"
    echo "  Error: $SUPPLIER_EMAIL_RESPONSE"
fi

echo ""

# Test 2: Supplier Phone Signup
echo "=========================================="
echo "Test 2: Supplier Phone Signup"
echo "=========================================="

PHONE_2="079${TIMESTAMP:(-6)}1"
TEMP_EMAIL_2="${PHONE_2//0/962}@contractors-mall.local"

echo "  📱 Signing up supplier with phone: $PHONE_2"
echo "  Generated temp email: $TEMP_EMAIL_2"

SUPPLIER_PHONE_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/auth/v1/signup" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEMP_EMAIL_2}\",
        \"password\": \"temp_${TIMESTAMP}\",
        \"data\": {
            \"full_name\": \"Test Supplier Phone\",
            \"phone\": \"+962${PHONE_2:1}\",
            \"role\": \"supplier_admin\",
            \"signup_method\": \"phone\"
        }
    }")

echo "  Response: $SUPPLIER_PHONE_RESPONSE"

SUPPLIER_PHONE_USER_ID=$(echo $SUPPLIER_PHONE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$SUPPLIER_PHONE_USER_ID" ]; then
    echo "  ✅ Supplier (phone) created with ID: $SUPPLIER_PHONE_USER_ID"
    check_profile "$SUPPLIER_PHONE_USER_ID"
else
    echo "  ❌ Failed to create supplier (phone)"
    echo "  Error: $SUPPLIER_PHONE_RESPONSE"
fi

echo ""

# Test 3: Contractor Email Signup
echo "=========================================="
echo "Test 3: Contractor Email Signup"
echo "=========================================="

echo "  📧 Signing up contractor with email..."
CONTRACTOR_EMAIL_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/auth/v1/signup" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEST_CONTRACTOR_EMAIL}\",
        \"password\": \"TestPassword123!\",
        \"data\": {
            \"full_name\": \"Test Contractor\",
            \"phone\": \"${TEST_PHONE}\",
            \"role\": \"contractor\",
            \"signup_method\": \"email\"
        }
    }")

echo "  Response: $CONTRACTOR_EMAIL_RESPONSE"

CONTRACTOR_USER_ID=$(echo $CONTRACTOR_EMAIL_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$CONTRACTOR_USER_ID" ]; then
    echo "  ✅ Contractor created with ID: $CONTRACTOR_USER_ID"
    check_profile "$CONTRACTOR_USER_ID"
else
    echo "  ❌ Failed to create contractor"
    echo "  Error: $CONTRACTOR_EMAIL_RESPONSE"
fi

echo ""

# Test 4: Contractor Phone Signup
echo "=========================================="
echo "Test 4: Contractor Phone Signup"
echo "=========================================="

PHONE_4="079${TIMESTAMP:(-6)}3"
TEMP_EMAIL_4="${PHONE_4//0/962}@contractors-mall.local"

echo "  📱 Signing up contractor with phone: $PHONE_4"
echo "  Generated temp email: $TEMP_EMAIL_4"

CONTRACTOR_PHONE_RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/auth/v1/signup" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${TEMP_EMAIL_4}\",
        \"password\": \"temp_${TIMESTAMP}\",
        \"data\": {
            \"full_name\": \"Test Contractor Phone\",
            \"phone\": \"+962${PHONE_4:1}\",
            \"role\": \"contractor\",
            \"signup_method\": \"phone\"
        }
    }")

echo "  Response: $CONTRACTOR_PHONE_RESPONSE"

CONTRACTOR_PHONE_USER_ID=$(echo $CONTRACTOR_PHONE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$CONTRACTOR_PHONE_USER_ID" ]; then
    echo "  ✅ Contractor (phone) created with ID: $CONTRACTOR_PHONE_USER_ID"
    check_profile "$CONTRACTOR_PHONE_USER_ID"
else
    echo "  ❌ Failed to create contractor (phone)"
    echo "  Error: $CONTRACTOR_PHONE_RESPONSE"
fi

echo ""
echo "=========================================="
echo "✅ All Tests Completed!"
echo "=========================================="
