#!/bin/bash

# Script to make all migration triggers idempotent by adding DROP TRIGGER IF EXISTS

MIGRATIONS_DIR="supabase/migrations"

# Function to fix a trigger in a file
fix_trigger() {
    local file="$1"
    local trigger_name="$2"
    local table_name="$3"

    # Check if DROP TRIGGER already exists for this trigger
    if grep -q "DROP TRIGGER IF EXISTS ${trigger_name}" "$file"; then
        echo "  ✓ ${trigger_name} already has DROP TRIGGER"
        return
    fi

    # Add DROP TRIGGER IF EXISTS before CREATE TRIGGER
    # Using perl for cross-platform compatibility
    perl -i -pe "s/(CREATE TRIGGER ${trigger_name})/DROP TRIGGER IF EXISTS ${trigger_name} ON ${table_name};\n\1/" "$file"
    echo "  ✓ Fixed ${trigger_name} in $(basename "$file")"
}

echo "🔧 Fixing migration triggers to be idempotent..."
echo

# Fix specific known triggers
fix_trigger "${MIGRATIONS_DIR}/20250125_create_profiles.sql" "update_profiles_updated_at" "profiles"
fix_trigger "${MIGRATIONS_DIR}/20251031_auto_create_profile_trigger.sql" "on_auth_user_created" "auth.users"
fix_trigger "${MIGRATIONS_DIR}/20251031_auto_create_profile_trigger_v2.sql" "on_auth_user_created" "auth.users"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_2d_insights_messaging.sql" "on_order_status_change" "orders"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_order_enhancements_FIXED.sql" "update_order_notes_updated_at" "order_notes"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_order_enhancements_FIXED.sql" "update_order_tags_updated_at" "order_tags"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_order_enhancements_FIXED.sql" "create_activity_on_note" "order_notes"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_order_enhancements.sql" "update_order_notes_updated_at" "order_notes"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_order_enhancements.sql" "update_order_tags_updated_at" "order_tags"
fix_trigger "${MIGRATIONS_DIR}/20251105_phase_2c_order_enhancements.sql" "create_activity_on_note" "order_notes"

echo
echo "✅ All migration triggers have been made idempotent!"
