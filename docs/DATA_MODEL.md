# Contractors Mall Data Model

## Overview
This document describes the database schema for Contractors Mall, a bilingual construction materials marketplace for Jordan.

## Core Tables

### profiles
User profiles extending Supabase Auth
- `id` (UUID, PK): References auth.users
- `role` (ENUM): contractor|supplier_admin|driver|admin
- `phone` (TEXT): Unique phone number
- `full_name` (TEXT): User's full name
- `preferred_language` (ENUM): ar|en
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

### orders
Customer orders
- `id` (UUID, PK)
- `order_number` (TEXT): Unique order number
- `contractor_id` (UUID, FK): References profiles
- `supplier_id` (UUID, FK): References suppliers
- `status` (ENUM): pending|confirmed|in_delivery|delivered|completed|cancelled
- `total_jod` (NUMERIC): Total order amount
- `delivery_fee_jod` (NUMERIC): Calculated delivery fee
- `vehicle_class_id` (UUID, FK): Auto-selected vehicle
- `delivery_zone` (ENUM): zone_a|zone_b
- `scheduled_delivery_date` (DATE): Delivery date

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
- `order_id` (UUID, FK): References orders
- `payment_intent_id` (TEXT): HyperPay checkout ID
- `status` (ENUM): pending|held|released|refunded|failed
- `amount_jod` (NUMERIC): Payment amount
- `held_at` (TIMESTAMPTZ): Escrow hold time
- `released_at` (TIMESTAMPTZ): Release time

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
vehicles (1) ─── (N) supplier_zone_fees
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