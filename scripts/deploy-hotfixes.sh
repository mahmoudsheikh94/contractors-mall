#!/bin/bash

# ============================================================================
# Deploy Database Hotfixes to Supabase
# ============================================================================
# This script applies all pending hotfixes to the production database
# ============================================================================

set -e

echo "🔧 Deploying Database Hotfixes..."
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Get the project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR"

echo "📂 Project directory: $PROJECT_DIR"
echo ""

# Check if linked to Supabase project
if [ ! -f .supabase/config.toml ]; then
    echo "⚠️  Not linked to a Supabase project."
    echo "Run: supabase link --project-ref <your-project-ref>"
    exit 1
fi

echo "📋 Migrations to apply:"
echo "   • 20251108100000_apply_all_pending_hotfixes.sql"
echo ""

# Apply migrations
echo "🚀 Applying migrations..."
supabase db push --include-all

echo ""
echo "✅ Hotfixes applied successfully!"
echo ""
echo "🔍 Verifying deployment..."

# Run verification query
supabase db execute <<SQL
DO \$\$
DECLARE
  v_orders_policies INTEGER;
  v_order_items_policies INTEGER;
  v_function_exists BOOLEAN;
  v_vehicle_class_removed BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_orders_policies
  FROM pg_policies WHERE tablename = 'orders';

  SELECT COUNT(*) INTO v_order_items_policies
  FROM pg_policies WHERE tablename = 'order_items';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fn_calculate_delivery_fee'
  ) INTO v_function_exists;

  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'supplier_zone_fees' AND column_name = 'vehicle_class_id'
  ) INTO v_vehicle_class_removed;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   Orders policies: %', v_orders_policies;
  RAISE NOTICE '   Order items policies: %', v_order_items_policies;
  RAISE NOTICE '   Delivery fee function: %', CASE WHEN v_function_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   Vehicle class removed: %', CASE WHEN v_vehicle_class_removed THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
END \$\$;
SQL

echo ""
echo "🎯 Next Steps:"
echo "   1. Test order creation in the app"
echo "   2. Verify delivery fee calculations"
echo "   3. Monitor for RLS errors"
echo ""
