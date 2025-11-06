#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEB_URL="${WEB_URL:-https://contractors-mall.vercel.app}"
ADMIN_URL="${ADMIN_URL:-https://contractors-mall-admin.vercel.app}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Contractors Mall Deployment Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check endpoint health
check_endpoint() {
  local name=$1
  local url=$2
  local endpoint=$3

  echo -e "${YELLOW}Checking ${name}...${NC}"

  # Check if endpoint is reachable
  if curl -f -s -o /dev/null -w "%{http_code}" "${url}${endpoint}" | grep -q "200"; then
    echo -e "${GREEN}✅ ${name} is healthy${NC}"
    echo -e "   URL: ${url}${endpoint}"
    return 0
  else
    echo -e "${RED}❌ ${name} is not responding${NC}"
    echo -e "   URL: ${url}${endpoint}"
    return 1
  fi
}

# Function to check build status
check_build() {
  local name=$1
  local url=$2

  echo -e "${YELLOW}Checking ${name} build...${NC}"

  # Try to fetch the page
  response=$(curl -s -w "\n%{http_code}" "${url}")
  status_code=$(echo "$response" | tail -n 1)

  if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✅ ${name} is deployed and serving content${NC}"
    return 0
  else
    echo -e "${RED}❌ ${name} returned status code: ${status_code}${NC}"
    return 1
  fi
}

# Function to check API health
check_api_health() {
  local name=$1
  local url=$2

  echo -e "${YELLOW}Checking ${name} API health...${NC}"

  # Check webhook health endpoint
  response=$(curl -s "${url}/api/webhooks/vercel")

  if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✅ ${name} API is healthy${NC}"
    return 0
  else
    echo -e "${RED}❌ ${name} API health check failed${NC}"
    return 1
  fi
}

# Check Web App
echo ""
echo -e "${BLUE}--- Web App (Contractor) ---${NC}"
check_build "Web App" "$WEB_URL"
check_api_health "Web App" "$WEB_URL"

echo ""

# Check Admin App
echo -e "${BLUE}--- Admin App (Supplier/Admin) ---${NC}"
check_build "Admin App" "$ADMIN_URL"
check_api_health "Admin App" "$ADMIN_URL"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment check complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Summary
echo -e "${BLUE}Deployment URLs:${NC}"
echo -e "  Web:   ${WEB_URL}"
echo -e "  Admin: ${ADMIN_URL}"
echo ""
echo -e "${BLUE}Webhook URLs:${NC}"
echo -e "  Web:   ${WEB_URL}/api/webhooks/vercel"
echo -e "  Admin: ${ADMIN_URL}/api/webhooks/vercel"
echo ""
