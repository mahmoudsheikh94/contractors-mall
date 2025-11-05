# Contractors Mall API Contracts

## Overview
This document defines the API contracts for Contractors Mall Edge Functions and RPC calls.

## Authentication
All API calls require JWT authentication via Supabase Auth.
```
Authorization: Bearer <jwt_token>
```

## Edge Functions

### Payments

#### POST `/payments/create-intent`
Creates a payment intent for an order.

**Request:**
```json
{
  "orderId": "uuid",
  "amount": 150.00,
  "returnUrl": "https://app.example.com/orders/123/complete"
}
```

**Response:**
```json
{
  "checkoutId": "8ac7a4a28abc...",
  "paymentUrl": "https://test.oppwa.com/..."
}
```

#### POST `/payments/release`
Releases held payment to supplier (Admin/System only).

**Request:**
```json
{
  "orderId": "uuid",
  "paymentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment released successfully"
}
```

#### POST `/payments/refund`
Processes refund for disputed order.

**Request:**
```json
{
  "orderId": "uuid",
  "paymentId": "uuid",
  "amount": 150.00,
  "reason": "dispute_resolved"
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "ref_123",
  "amount": 150.00
}
```

#### POST `/payments/webhook`
HyperPay webhook handler (System only).

**Request:** (from HyperPay)
```json
{
  "id": "checkout_id",
  "paymentType": "DB",
  "result": {
    "code": "000.100.110",
    "description": "Request successfully processed"
  },
  "customParameters": {
    "order_id": "uuid"
  }
}
```

### Disputes

#### POST `/disputes/transition`
Transitions dispute status (Admin only).

**Request:**
```json
{
  "disputeId": "uuid",
  "newStatus": "investigating",
  "qcNotes": "Called customer, checking with supplier",
  "qcAction": "pending_resolution"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dispute transitioned to investigating",
  "dispute_id": "uuid"
}
```

### Admin Settings

#### POST `/admin/update-settings`
Updates platform settings (Admin only).

**Request:**
```json
{
  "key": "delivery_settings",
  "value": {
    "photo_threshold_jod": 120,
    "pin_threshold_jod": 120,
    "safety_margin_percent": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated",
  "settings": { ... }
}
```

#### POST `/admin/upsert-vehicle`
Creates or updates vehicle class (Admin only).

**Request:**
```json
{
  "id": "uuid",
  "name_ar": "وانيت 1 طن",
  "name_en": "Pickup 1 Ton",
  "class_code": "pickup_1t",
  "max_weight_kg": 1000,
  "max_volume_m3": 3.5,
  "max_length_m": 3,
  "has_open_bed": true
}
```

**Response:**
```json
{
  "success": true,
  "vehicle": { ... }
}
```

#### POST `/admin/upsert-zone-fee`
Updates supplier zone fees (Admin only).

**Request:**
```json
{
  "supplier_id": "uuid",
  "zone": "zone_a",
  "vehicle_class_id": "uuid",
  "base_fee_jod": 5.00
}
```

**Response:**
```json
{
  "success": true,
  "zone_fee": { ... }
}
```

## RPC Functions (Database Functions)

### fn_estimate_vehicle
Calculates vehicle and delivery fee.

**Call:**
```javascript
const { data, error } = await supabase.rpc('fn_estimate_vehicle', {
  p_supplier_id: 'uuid',
  p_delivery_lat: 31.9539,
  p_delivery_lng: 35.9106,
  p_items_json: [
    {
      weight_kg: 500,
      volume_m3: 2,
      length_m: 2.5,
      requires_open_bed: false
    }
  ]
})
```

**Response:**
```json
{
  "vehicle_class_id": "uuid",
  "vehicle_name_ar": "شاحنة 3.5 طن",
  "vehicle_name_en": "Truck 3.5 Ton",
  "zone": "zone_a",
  "delivery_fee_jod": 10.00,
  "capacity_headroom": {
    "weight_utilization": 15.71,
    "volume_utilization": 16.67,
    "length_ok": true,
    "open_bed_ok": true
  },
  "distance_km": 7.5
}
```

### fn_visible_suppliers
Gets suppliers serving a location.

**Call:**
```javascript
const { data, error } = await supabase.rpc('fn_visible_suppliers', {
  p_delivery_lat: 31.9539,
  p_delivery_lng: 35.9106,
  p_category_id: 'uuid' // optional
})
```

**Response:**
```json
[
  {
    "supplier_id": "uuid",
    "business_name": "شركة الموّاد الأردنية",
    "business_name_en": "Jordan Materials Co",
    "distance_km": 5.2,
    "zone": "zone_a",
    "min_delivery_fee": 5.00,
    "rating_average": 4.5,
    "rating_count": 23,
    "products_count": 45
  }
]
```

## Standard Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "Order not found"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "details": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "details": "Admin role required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

## Rate Limiting
- Public endpoints: 100 requests/minute
- Authenticated endpoints: 500 requests/minute
- Admin endpoints: 1000 requests/minute

## Versioning
All endpoints follow semantic versioning. Current version: v1.0.0

## CORS
Allowed origins:
- http://localhost:3000 (development)
- http://localhost:3001 (admin development)
- https://app.contractorsmall.jo (production)
- https://admin.contractorsmall.jo (admin production)