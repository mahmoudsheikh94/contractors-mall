# Contractors Mall Data Model

## Overview
This document describes the database schema for Contractors Mall, a bilingual construction materials marketplace for Jordan.

**Last Updated:** January 13, 2025
**Schema Version:** 2.2 (Order Status Simplification)

## 🔑 Naming Conventions

**IMPORTANT:** All tables in this schema follow the industry-standard naming convention:
- **Primary keys:** Always named `id`
- **Foreign keys:** Always named `{table}_id` (e.g., `supplier_id`, `order_id`)

📖 **For detailed convention rules and examples, see:** [DATABASE_CONVENTIONS.md](./DATABASE_CONVENTIONS.md)

## Core Tables

### profiles
User profiles extending Supabase Auth
- `id` (UUID, PK): References auth.users
- `role` (ENUM): contractor|supplier_admin|driver|admin
- `email` (TEXT): Primary identifier, synced from auth.users
- `phone` (TEXT, UNIQUE): Optional phone number for contact
- `full_name` (TEXT): User's full name
- `email_verified` (BOOLEAN): Email verification status (default: false)
- `email_verified_at` (TIMESTAMPTZ): When email was verified
- `preferred_language` (TEXT): 'ar' or 'en' (default: 'ar')
- `is_active` (BOOLEAN): Account status

### suppliers
Verified material suppliers
- `id` (UUID, PK)
- `owner_id` (UUID, FK): References profiles
- `business_name` (TEXT): Arabic business name
- `business_name_en` (TEXT): English business name
- `latitude/longitude` (NUMERIC): Location coordinates
- `location` (GEOGRAPHY): PostGIS point
- `radius_km_zone_a` (NUMERIC): Zone A radius (default 10km)
- `radius_km_zone_b` (NUMERIC): Zone B radius (default 25km)
- `is_verified` (BOOLEAN): Verification status
- `wallet_balance` (NUMERIC): Current balance
- `rating_average` (NUMERIC): Average rating

### vehicles
Global vehicle class definitions
- `id` (UUID, PK)
- `name_ar/name_en` (TEXT): Bilingual names
- `class_code` (TEXT): Unique code (pickup_1t, truck_3.5t, flatbed_5t)
- `max_weight_kg` (NUMERIC): Weight capacity
- `max_volume_m3` (NUMERIC): Volume capacity
- `max_length_m` (NUMERIC): Maximum item length
- `has_open_bed` (BOOLEAN): Open bed flag

### products
Supplier product catalog
- `id` (UUID, PK)
- `supplier_id` (UUID, FK): References suppliers
- `category_id` (UUID, FK): References categories
- `sku` (TEXT): Product SKU
- `name_ar/name_en` (TEXT): Bilingual names
- `unit_ar/unit_en` (TEXT): Unit of measure
- `price_per_unit` (NUMERIC): Base price in JOD
- `weight_kg_per_unit` (NUMERIC): Weight per unit
- `volume_m3_per_unit` (NUMERIC): Volume per unit
- `requires_open_bed` (BOOLEAN): Requires flatbed

### supplier_zone_fees
Delivery fees per zone for each supplier
- `id` (UUID, PK)
- `supplier_id` (UUID, FK): References suppliers
- `zone` (ENUM): zone_a | zone_b
- `base_fee_jod` (NUMERIC): Delivery fee for this zone
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Unique constraint**: `(supplier_id, zone)` - One fee per zone per supplier

**Note**: The `vehicle_class_id` column was removed in hotfix 20251108100000. Suppliers now set a single fee per zone regardless of vehicle type.

### order_items
Individual line items within an order
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `product_id` (UUID, FK): References products
- `product_name` (TEXT, NULLABLE): Product name at time of order (⚠️ temporarily nullable - should pass from frontend)
- `unit` (TEXT, NULLABLE): Unit of measure at time of order (⚠️ temporarily nullable - should pass from frontend)
- `quantity` (NUMERIC): Quantity ordered
- `price_per_unit` (NUMERIC): Price per unit at time of order (JOD)
- `unit_price_jod` (NUMERIC): Alias for price_per_unit (for consistency)
- `total_jod` (NUMERIC): Line item total (quantity × price_per_unit)
- `weight_kg` (NUMERIC): Total weight for this line item
- `volume_m3` (NUMERIC): Total volume for this line item
- `created_at` (TIMESTAMPTZ)

**TODO**: Make `product_name` and `unit` NOT NULL after frontend checkout is updated to pass these values.

### orders
Customer orders
- `id` (UUID, PK)
- `order_number` (TEXT): Unique order number (ORD-YYYYMMDD-XXXXX)
- `contractor_id` (UUID, FK): References profiles
- `supplier_id` (UUID, FK): References suppliers
- `status` (ENUM): pending|confirmed|in_delivery|awaiting_contractor_confirmation|delivered|completed|cancelled
  - **Note**: 'rejected' and 'disputed' are NOT order statuses
    - Disputes are tracked in separate `disputes` table with their own status enum
    - 'accepted' status removed (Jan 2025) - was redundant with 'confirmed'
      - Both statuses meant "supplier accepted order"
      - Now uses single 'confirmed' status for supplier acceptance
      - Label: "تم تأكيد الطلب" (Order has been confirmed)
    - 'awaiting_contractor_confirmation' added for dual-delivery confirmation flow (supplier confirms → contractor confirms → payment released)
- `subtotal_jod` (NUMERIC): Items subtotal
- `delivery_fee_jod` (NUMERIC): Calculated delivery fee
- `total_jod` (NUMERIC): Total order amount (subtotal + delivery)
- `vehicle_class_id` (UUID, FK, NULLABLE): Vehicle reference (currently unused - suppliers handle logistics)
- `vehicle_type` (TEXT, NULLABLE): Vehicle type (currently unused - suppliers handle logistics)
- `delivery_zone` (ENUM): zone_a|zone_b
- `scheduled_delivery_date` (DATE): Delivery date
- `scheduled_delivery_time` (TEXT): Time slot
- `delivery_address` (TEXT): Full delivery address
- `delivery_latitude/longitude` (NUMERIC): GPS coordinates
- `rejection_reason` (TEXT): Reserved for future use
- `disputed_at` (TIMESTAMPTZ): When dispute was opened (references disputes table)

### deliveries
Delivery tracking and proof
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `driver_id` (UUID, FK): References profiles
- `proof_photo_url` (TEXT): Photo proof (<120 JOD)
- `confirmation_pin` (TEXT): PIN code (≥120 JOD)
- `pin_verified` (BOOLEAN): PIN verification status

### payments
Escrow payment tracking
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders (UNIQUE)
- `payment_intent_id` (TEXT): PSP checkout ID
- `payment_method` (TEXT): Payment method used
- `status` (ENUM): pending|escrow_held|released|refunded|failed|frozen
- `amount_jod` (NUMERIC): Payment amount
- `held_at` (TIMESTAMPTZ): Escrow hold time
- `released_at` (TIMESTAMPTZ): Release time
- `refunded_at` (TIMESTAMPTZ): Refund time
- `metadata` (JSONB): Additional payment data

### disputes
QC and dispute management
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `opened_by` (UUID, FK): References profiles
- `status` (ENUM): opened|investigating|resolved|escalated
- `reason` (TEXT): Dispute reason
- `qc_notes` (TEXT): QC investigation notes
- `site_visit_required` (BOOLEAN): Site visit flag (≥350 JOD)

### settings
Platform configuration
- `key` (TEXT, PK): Setting key
- `value` (JSONB): Setting value
- Keys:
  - `delivery_settings`: photo_threshold_jod (120), safety_margin_percent (10)
  - `commission_settings`: commission_percent (10), free_period_days (30)
  - `dispute_settings`: site_visit_threshold_jod (350)

## Phase 1.2: Support & Admin Tools (Implemented)

### admin_conversations
Support conversations between admins and users
- `id` (UUID, PK)
- `subject` (TEXT): Conversation subject
- `order_id` (UUID, FK, NULLABLE): Related order (if applicable)
- `status` (TEXT): 'open' | 'closed'
- `priority` (TEXT): 'low' | 'normal' | 'high' | 'urgent'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `closed_at` (TIMESTAMPTZ)
- `closed_by` (UUID, FK): References profiles

### admin_conversation_participants
Participants in support conversations
- `conversation_id` (UUID, FK): References admin_conversations
- `user_id` (UUID, FK): References profiles
- `role` (TEXT): 'admin' | 'customer'
- `joined_at` (TIMESTAMPTZ)
- `last_read_at` (TIMESTAMPTZ)
- **Primary Key**: `(conversation_id, user_id)`

### admin_messages
Messages within support conversations
- `id` (UUID, PK)
- `conversation_id` (UUID, FK): References admin_conversations
- `sender_id` (UUID, FK): References profiles
- `content` (TEXT): Message content
- `attachments` (TEXT[]): Array of attachment URLs
- `is_read` (BOOLEAN): Read status
- `is_internal` (BOOLEAN): Internal admin notes (not visible to customers)
- `created_at` (TIMESTAMPTZ)
- `read_at` (TIMESTAMPTZ)

### email_templates
Reusable bilingual email templates
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE): Template identifier
- `description` (TEXT): Template description
- `subject_ar` (TEXT): Arabic email subject
- `subject_en` (TEXT): English email subject
- `body_ar` (TEXT): Arabic email body
- `body_en` (TEXT): English email body
- `variables` (JSONB): Available template variables
- `category` (TEXT): Template category (default: 'general')
- `is_active` (BOOLEAN): Whether template is active
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK): References profiles
- `updated_by` (UUID, FK): References profiles

## Phase 2 Enhanced Features Tables

### order_notes
Internal notes and annotations on orders
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `note` (TEXT): Note content
- `created_by` (UUID, FK): References profiles (author)
- `is_internal` (BOOLEAN): Visible only to admins/suppliers
- `created_at` (TIMESTAMPTZ)

### order_tags
Categorization and filtering for orders
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `tag` (TEXT): Tag name (e.g., "urgent", "bulk", "special")
- `created_by` (UUID, FK): References profiles
- `created_at` (TIMESTAMPTZ)

### order_communications
In-app messaging between contractor and supplier
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `sender_id` (UUID, FK): References profiles
- `message` (TEXT): Message content
- `is_read` (BOOLEAN): Read status
- `created_at` (TIMESTAMPTZ)

### order_activities
Activity log for order lifecycle events
- `id` (UUID, PK)
- `order_id` (UUID, FK): References orders
- `activity_type` (TEXT): e.g., 'status_change', 'note_added', 'tag_added', 'delivery_started'
- `description` (TEXT): Human-readable activity description
- `metadata` (JSONB): Additional structured data about the activity
- `created_by` (UUID, FK): References profiles (who performed the action)
- `created_at` (TIMESTAMPTZ)

### contractor_communications
Communication log between suppliers and contractors (supplier-to-contractor messaging)
- `id` (UUID, PK)
- `contractor_id` (UUID, FK): References profiles (contractor)
- `supplier_id` (UUID, FK): References suppliers
- `order_id` (UUID, FK, NULLABLE): Related order (optional)
- `type` (TEXT): Communication type (e.g., 'inquiry', 'follow_up', 'issue')
- `subject` (TEXT): Communication subject
- `message` (TEXT): Message content
- `metadata` (JSONB): Additional data
- `created_by` (UUID, FK): References profiles (sender)
- `created_at` (TIMESTAMPTZ)

### email_queue
Outbound email queue for notifications and transactional emails
- `id` (UUID, PK)
- `recipient_email` (TEXT): Email address to send to
- `template_id` (TEXT): References email_templates.name
- `data` (JSONB): Template variable values
- `sent_at` (TIMESTAMPTZ, NULLABLE): When email was sent (null = pending)
- `error_message` (TEXT, NULLABLE): Error if send failed
- `created_at` (TIMESTAMPTZ)

**Note**: Emails are processed asynchronously. Failed emails are retried based on error_message.

### contractor_insights (VIEW)
Aggregated analytics about contractor behavior per supplier
- `contractor_id` (UUID): References profiles
- `supplier_id` (UUID): References suppliers
- `contractor_name` (TEXT): Contractor's full name
- `contractor_email` (TEXT): Contractor's email
- `contractor_phone` (TEXT): Contractor's phone
- `total_orders` (INTEGER): Total orders placed
- `total_spent` (NUMERIC): Total amount spent (JOD)
- `average_order_value` (NUMERIC): Average order amount
- `last_order_date` (DATE): Most recent order date
- `days_since_last_order` (INTEGER): Days since last order
- `orders_last_30_days` (INTEGER): Orders in last 30 days
- `orders_last_90_days` (INTEGER): Orders in last 90 days
- `completed_orders` (INTEGER): Successfully completed orders
- `disputed_orders` (INTEGER): Orders with disputes
- `rejected_orders` (INTEGER): Cancelled/rejected orders

**Note**: This is a database VIEW, not a table. Automatically updated.

### contractor_category_preferences (VIEW)
Product category preferences per contractor-supplier relationship
- `contractor_id` (UUID): References profiles
- `supplier_id` (UUID): References suppliers
- `category_id` (UUID): References categories
- `category_name_ar` (TEXT): Category name (Arabic)
- `category_name_en` (TEXT): Category name (English)
- `total_spent_on_category` (NUMERIC): Total spent in this category (JOD)
- `order_count` (INTEGER): Number of orders containing items from this category
- `last_order_date` (DATE): Most recent order with items from this category

**Note**: This is a database VIEW, not a table. Automatically updated.

### in_app_notifications
User notifications system
- `id` (UUID, PK)
- `user_id` (UUID, FK): References profiles
- `type` (TEXT): Notification type
- `title` (TEXT): Notification title
- `message` (TEXT): Notification body
- `is_read` (BOOLEAN): Read status
- `action_url` (TEXT): Optional deep link
- `created_at` (TIMESTAMPTZ)

### dispute_communications
Messaging within dispute resolution workflow
- `id` (UUID, PK)
- `dispute_id` (UUID, FK): References disputes
- `sender_id` (UUID, FK): References profiles
- `message` (TEXT): Communication content
- `created_at` (TIMESTAMPTZ)

### dispute_site_visits
Site visit scheduling and tracking
- `id` (UUID, PK)
- `dispute_id` (UUID, FK): References disputes
- `scheduled_date` (DATE): Scheduled visit date
- `scheduled_by` (UUID, FK): References profiles (admin)
- `completed_at` (TIMESTAMPTZ): When visit completed
- `inspector_id` (UUID, FK): References profiles (driver/admin)
- `inspector_notes` (TEXT): Findings and observations
- `photo_urls` (JSONB): Array of photo URLs from visit

### wallet_transactions
Supplier wallet transaction history
- `id` (UUID, PK)
- `supplier_id` (UUID, FK): References suppliers
- `type` (TEXT): 'credit', 'debit', 'hold', 'release', 'refund'
- `amount_jod` (NUMERIC): Transaction amount
- `balance_after` (NUMERIC): Wallet balance after transaction
- `reference_id` (UUID): Related order/payment ID
- `description` (TEXT): Transaction description
- `created_at` (TIMESTAMPTZ)

### contractor_insights
Analytics and metrics per contractor
- `id` (UUID, PK)
- `contractor_id` (UUID, FK): References profiles
- `total_orders` (INTEGER): Lifetime order count
- `total_spent` (NUMERIC): Lifetime spending in JOD
- `average_order_value` (NUMERIC): AOV
- `favorite_categories` (JSONB): Array of category IDs with counts
- `favorite_suppliers` (JSONB): Array of supplier IDs with counts
- `last_order_date` (DATE): Most recent order
- `updated_at` (TIMESTAMPTZ): Last calculation time

### supplier_profiles
Extended supplier business metadata
- `id` (UUID, PK)
- `supplier_id` (UUID, FK): References suppliers (UNIQUE)
- `commercial_registration` (TEXT): CR number
- `tax_id` (TEXT): Tax registration number
- `bank_account_info` (JSONB): Bank details for payouts
- `business_hours` (JSONB): Operating hours per day
- `delivery_capabilities` (JSONB): Special delivery notes
- `additional_info` (JSONB): Other metadata
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Key Relationships

```
profiles (1) ─── (N) suppliers
suppliers (1) ─── (N) products
suppliers (1) ─── (N) supplier_zone_fees
suppliers (1) ─── (N) orders
orders (1) ─── (N) order_items
orders (1) ─── (1) deliveries
orders (1) ─── (1) payments
orders (1) ─── (N) disputes
profiles (1) ─── (N) projects (contractor)
categories (1) ─── (N) products
admin_conversations (1) ─── (N) admin_messages
admin_conversations (1) ─── (N) admin_conversation_participants
```

## RLS Policies

### Key Security Rules
- **Contractors**: Can view/manage their own orders, projects
- **Suppliers**: Can manage their products, view their orders
- **Drivers**: Can view assigned deliveries
- **Admin**: Full access to all tables
- **Public**: Can view verified suppliers and available products

## PostGIS Spatial Queries

### Zone Calculation
```sql
-- Determine delivery zone based on distance
CASE
  WHEN ST_Distance(supplier.location, delivery_point) <= radius_km_zone_a * 1000 THEN 'zone_a'
  WHEN ST_Distance(supplier.location, delivery_point) <= radius_km_zone_b * 1000 THEN 'zone_b'
  ELSE NULL -- Outside service area
END
```

### Visible Suppliers
```sql
-- Find suppliers that can deliver to location
SELECT * FROM suppliers
WHERE ST_Distance(location, delivery_point) <= radius_km_zone_b * 1000
  AND is_verified = true
```

## Business Logic Functions

### fn_estimate_vehicle
Calculates appropriate vehicle and delivery fee
- Inputs: supplier_id, delivery_lat/lng, items_json
- Returns: vehicle_class_id, zone, delivery_fee_jod
- Logic: +10% safety margin on capacity

### fn_visible_suppliers
Returns suppliers serving a location
- Inputs: delivery_lat/lng, category_id (optional)
- Returns: List of suppliers with distance and min fee

### get_delivery_approval_method
Determines proof requirement
- Input: order_total
- Returns: 'photo' (<120 JOD) or 'pin' (≥120 JOD)

### check_site_visit_requirement
Checks if site visit needed for dispute
- Input: order_id
- Returns: Boolean (true if ≥350 JOD)