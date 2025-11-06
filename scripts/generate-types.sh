#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Supabase Types Generation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Supabase project ID is set
if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo -e "${RED}❌ Error: SUPABASE_PROJECT_ID environment variable not set${NC}"
  echo ""
  echo "Please set it by running:"
  echo "  export SUPABASE_PROJECT_ID=your-project-id"
  echo ""
  echo "Or add it to your .env file"
  exit 1
fi

# Determine project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"
echo -e "${YELLOW}Supabase project: ${SUPABASE_PROJECT_ID}${NC}"
echo ""

# Generate types for web app
echo -e "${BLUE}Generating types for web app...${NC}"
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > "$PROJECT_ROOT/apps/web/src/types/database.ts"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Web app types generated successfully${NC}"
  echo -e "   File: apps/web/src/types/database.ts"
else
  echo -e "${RED}❌ Failed to generate web app types${NC}"
  exit 1
fi

echo ""

# Generate types for admin app
echo -e "${BLUE}Generating types for admin app...${NC}"
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > "$PROJECT_ROOT/apps/admin/src/types/supabase.ts"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Admin app types generated successfully${NC}"
  echo -e "   File: apps/admin/src/types/supabase.ts"
else
  echo -e "${RED}❌ Failed to generate admin app types${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Type generation complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Run type checks
echo -e "${YELLOW}Running type checks...${NC}"
echo ""

cd "$PROJECT_ROOT"

echo -e "${BLUE}Checking web app types...${NC}"
if pnpm --filter @contractors-mall/web type-check; then
  echo -e "${GREEN}✅ Web app type check passed${NC}"
else
  echo -e "${RED}❌ Web app type check failed${NC}"
  echo -e "${YELLOW}⚠️  Types generated but compilation has errors${NC}"
fi

echo ""

echo -e "${BLUE}Checking admin app types...${NC}"
if pnpm --filter @contractors-mall/admin type-check; then
  echo -e "${GREEN}✅ Admin app type check passed${NC}"
else
  echo -e "${RED}❌ Admin app type check failed${NC}"
  echo -e "${YELLOW}⚠️  Types generated but compilation has errors${NC}"
fi

echo ""
echo -e "${GREEN}Done! Review the changes and commit if everything looks good.${NC}"
echo ""
