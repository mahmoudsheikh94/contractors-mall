-- ==========================================
-- CONTRACTORS MALL - CURRENT DATABASE SCHEMA
-- Last Updated: November 5, 2025
-- ==========================================
-- WARNING: This schema is for context/reference only.
-- It represents the current state and should be updated when schema changes.
-- ==========================================

-- TABLES OVERVIEW:
-- - categories: Product categories (hierarchical)
-- - deliveries: Delivery tracking and proof
-- - disputes: Order disputes and QC workflow
-- - media: File uploads for various entities
-- - order_items: Line items within orders
-- - orders: Main orders table
-- - payment_events: Payment state change history
-- - payments: Payment and escrow management
-- - products: Supplier product catalog
-- - profiles: User profiles (contractors, suppliers, drivers, admins)
-- - projects: Contractor project management
-- - reviews: Order reviews and ratings
-- - settings: System configuration
-- - supplier_zone_fees: Delivery fee matrix by zone and vehicle
-- - suppliers: Supplier business profiles
-- - vehicles: Vehicle class definitions

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  parent_id uuid,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_name text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);

CREATE TABLE public.deliveries (
  delivery_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE,
  driver_id uuid,
  driver_name text,
  driver_phone text,
  vehicle_plate_number text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  proof_photo_url text,
  confirmation_pin text,
  pin_verified boolean DEFAULT false,
  recipient_name text,
  recipient_phone text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  scheduled_date date NOT NULL,
  scheduled_time_slot text NOT NULL,
  address_line text NOT NULL,
  neighborhood text NOT NULL,
  city text NOT NULL,
  building_number text,
  floor_number text,
  apartment_number text,
  phone text NOT NULL,
  coordinates jsonb,
  delivery_pin text,
  pin_attempts integer DEFAULT 0,
  pin_verified_at timestamp with time zone,
  photo_url text,
  photo_uploaded_at timestamp with time zone,
  CONSTRAINT deliveries_pkey PRIMARY KEY (delivery_id),
  CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id), -- NOTE: References orders.id
  CONSTRAINT deliveries_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.disputes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  status USER-DEFINED DEFAULT 'opened'::dispute_status,
  reason text NOT NULL,
  description text,
  qc_notes text,
  qc_action text,
  site_visit_required boolean DEFAULT false,
  site_visit_completed boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolution text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id), -- NOTE: References orders.id
  CONSTRAINT disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.media (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT media_pkey PRIMARY KEY (id),
  CONSTRAINT media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.order_items (
  item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  weight_kg numeric,
  volume_m3 numeric,
  created_at timestamp with time zone DEFAULT now(),
  product_name text NOT NULL,
  unit text NOT NULL,
  unit_price_jod numeric NOT NULL,
  total_jod numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (item_id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id), -- NOTE: References orders.id
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(), -- NOTE: Primary key is 'id', not 'order_id'
  order_number text NOT NULL UNIQUE,
  contractor_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  project_id uuid,
  status USER-DEFINED DEFAULT 'pending'::order_status,
  subtotal_jod numeric NOT NULL,
  delivery_fee_jod numeric NOT NULL,
  total_jod numeric NOT NULL,
  vehicle_class_id uuid,
  delivery_zone USER-DEFINED,
  delivery_address text NOT NULL,
  delivery_latitude numeric NOT NULL,
  delivery_longitude numeric NOT NULL,
  scheduled_delivery_date date NOT NULL,
  scheduled_delivery_time text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  vehicle_type text NOT NULL,
  rejection_reason text,
  delivery_notes text,
  disputed_at timestamp with time zone,
  dispute_reason text,
  delivery_date date,
  delivery_time_slot text,
  delivery_neighborhood text,
  delivery_city text,
  delivery_building text,
  delivery_floor text,
  delivery_apartment text,
  delivery_phone text,
  delivery_coordinates jsonb,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT orders_vehicle_class_id_fkey FOREIGN KEY (vehicle_class_id) REFERENCES public.vehicles(id)
);

CREATE TABLE public.payment_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  payment_id uuid NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_events_pkey PRIMARY KEY (id),
  CONSTRAINT payment_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE,
  payment_intent_id text UNIQUE,
  payment_method text,
  status USER-DEFINED DEFAULT 'pending'::payment_status,
  amount_jod numeric NOT NULL,
  held_at timestamp with time zone,
  released_at timestamp with time zone,
  refunded_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) -- NOTE: References orders.id
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL,
  category_id uuid NOT NULL,
  sku text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  unit_ar text NOT NULL,
  unit_en text NOT NULL,
  price_per_unit numeric NOT NULL,
  min_order_quantity numeric DEFAULT 1,
  weight_kg_per_unit numeric,
  volume_m3_per_unit numeric,
  length_m_per_unit numeric,
  requires_open_bed boolean DEFAULT false,
  stock_quantity numeric,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'contractor'::user_role,
  phone text UNIQUE,
  full_name text NOT NULL,
  preferred_language text DEFAULT 'ar'::text CHECK (preferred_language = ANY (ARRAY['ar'::text, 'en'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  email text,
  email_verified boolean DEFAULT false,
  email_verified_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  contractor_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  address text,
  latitude numeric,
  longitude numeric,
  budget_estimate numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE,
  contractor_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id), -- NOTE: References orders.id
  CONSTRAINT reviews_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.profiles(id),
  CONSTRAINT reviews_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

CREATE TABLE public.settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT settings_pkey PRIMARY KEY (key),
  CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.supplier_zone_fees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL,
  zone USER-DEFINED NOT NULL,
  vehicle_class_id uuid NOT NULL,
  base_fee_jod numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT supplier_zone_fees_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_zone_fees_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT supplier_zone_fees_vehicle_class_id_fkey FOREIGN KEY (vehicle_class_id) REFERENCES public.vehicles(id)
);

CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  business_name text NOT NULL,
  business_name_en text,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  location USER-DEFINED DEFAULT st_setsrid(st_makepoint((longitude)::double precision, (latitude)::double precision), 4326),
  radius_km_zone_a numeric DEFAULT 10,
  radius_km_zone_b numeric DEFAULT 25,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  wallet_balance numeric DEFAULT 0,
  wallet_pending numeric DEFAULT 0,
  wallet_available numeric DEFAULT 0,
  rating_average numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  license_number text,
  tax_number text,
  city text,
  district text,
  street text,
  building text,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  class_code text NOT NULL UNIQUE,
  max_weight_kg numeric NOT NULL,
  max_volume_m3 numeric NOT NULL,
  max_length_m numeric NOT NULL,
  has_open_bed boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);

-- ==========================================
-- IMPORTANT NOTES:
-- ==========================================
-- 1. Orders table primary key is 'id', not 'order_id'
--    - All foreign keys should reference orders(id)
-- 2. The 'order_number' is a unique text field for display
-- 3. Some tables use custom ENUM types (dispute_status, order_status, payment_status, user_role, delivery_zone)
-- 4. Deliveries table uses 'delivery_id' as PK but references orders(id) via 'order_id' FK
