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

## Phase 2 API Endpoints (January 2025)

### Delivery Confirmation

#### POST `/api/deliveries/confirm-photo`
Confirms delivery with photo proof (<120 JOD orders).

**Request:**
```json
{
  "deliveryId": "uuid",
  "photoUrl": "https://storage.supabase.co/...",
  "notes": "Delivered to reception desk"
}
```

**Response:**
```json
{
  "success": true,
  "delivery_id": "uuid",
  "completed_at": "2025-01-11T10:30:00Z",
  "order": {
    "id": "uuid",
    "status": "delivered",
    "order_number": "ORD-2025-001"
  }
}
```

#### POST `/api/deliveries/verify-pin`
Confirms delivery with PIN verification (≥120 JOD orders).

**Request:**
```json{
  "deliveryId": "uuid",
  "pin": "1234",
  "photoUrl": "https://storage.supabase.co/..." // optional
}
```

**Response:**
```json
{
  "success": true,
  "delivery_id": "uuid",
  "pin_verified_at": "2025-01-11T10:30:00Z",
  "completed_at": "2025-01-11T10:30:00Z",
  "order": {
    "id": "uuid",
    "status": "delivered",
    "order_number": "ORD-2025-001"
  }
}
```

**Error (Invalid PIN):**
```json
{
  "success": false,
  "error": "Invalid PIN",
  "attemptsRemaining": 2,
  "maxAttempts": 3
}
```

### Supplier Contractor Management

#### GET `/api/supplier/contractors/top`
Get top contractors by revenue for current supplier.

**Query Parameters:**
- `limit` (optional): Number of contractors to return (default: 10)

**Response:**
```json
[
  {
    "contractor_id": "uuid",
    "full_name": "أحمد محمود",
    "email": "ahmad@example.com",
    "phone": "+962791234567",
    "total_orders": 15,
    "total_spent": 4500.00,
    "average_order_value": 300.00,
    "last_order_date": "2025-01-10T14:20:00Z",
    "days_since_last_order": 1
  }
]
```

#### GET `/api/supplier/contractors/[id]`
Get detailed contractor profile and analytics.

**Response:**
```json
{
  "contractor": {
    "id": "uuid",
    "full_name": "أحمد محمود",
    "email": "ahmad@example.com",
    "phone": "+962791234567",
    "created_at": "2024-11-01T08:00:00Z"
  },
  "insights": {
    "total_orders": 15,
    "total_spent": 4500.00,
    "average_order_value": 300.00,
    "last_order_date": "2025-01-10T14:20:00Z",
    "orders_last_30_days": 5,
    "orders_last_90_days": 12,
    "completed_orders": 14,
    "disputed_orders": 0,
    "rejected_orders": 1
  },
  "preferredCategories": [
    {
      "category_id": "uuid",
      "category_name": "إسمنت وخرسانة",
      "total_spent": 2500.00,
      "order_count": 8
    }
  ]
}
```

#### GET `/api/supplier/contractors/[id]/history`
Get order history for specific contractor.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Orders per page (default: 20)
- `status` (optional): Filter by order status

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORD-2025-001",
      "total_jod": 350.00,
      "status": "completed",
      "created_at": "2025-01-10T14:20:00Z",
      "delivered_at": "2025-01-11T10:30:00Z",
      "items_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

### Order Management Enhancements

#### POST `/api/supplier/orders/[id]/notes`
Add internal note to order.

**Request:**
```json
{
  "content": "عميل طلب التوصيل صباحاً فقط",
  "is_internal": true
}
```

**Response:**
```json
{
  "success": true,
  "note": {
    "id": "uuid",
    "order_id": "uuid",
    "content": "عميل طلب التوصيل صباحاً فقط",
    "is_internal": true,
    "created_at": "2025-01-11T10:30:00Z",
    "created_by": "uuid"
  }
}
```

#### DELETE `/api/supplier/orders/[id]/notes/[noteId]`
Delete order note.

**Response:**
```json
{
  "success": true,
  "message": "Note deleted"
}
```

#### POST `/api/supplier/orders/[id]/tags`
Add tag to order.

**Request:**
```json
{
  "tag": "urgent"
}
```

**Response:**
```json
{
  "success": true,
  "orderTags": ["urgent", "high-value"]
}
```

#### DELETE `/api/supplier/orders/[id]/tags`
Remove tag from order.

**Request:**
```json
{
  "tag": "urgent"
}
```

**Response:**
```json
{
  "success": true,
  "orderTags": ["high-value"]
}
```

#### GET `/api/supplier/orders/[id]/activities`
Get activity timeline for order.

**Response:**
```json
[
  {
    "id": "uuid",
    "order_id": "uuid",
    "activity_type": "status_change",
    "description": "Order status changed to in_delivery",
    "metadata": {
      "from_status": "confirmed",
      "to_status": "in_delivery"
    },
    "created_by": "uuid",
    "created_at": "2025-01-11T09:00:00Z"
  }
]
```

#### POST `/api/supplier/orders/[id]/start-delivery`
Start delivery for order.

**Request:**
```json
{
  "driverName": "محمد علي",
  "driverPhone": "+962791234567",
  "vehiclePlateNumber": "12345"
}
```

**Response:**
```json
{
  "success": true,
  "delivery": {
    "id": "uuid",
    "delivery_id": "DEL-2025-001",
    "order_id": "uuid",
    "status": "in_delivery",
    "scheduled_date": "2025-01-12",
    "scheduled_time_slot": "morning"
  }
}
```

#### GET `/api/supplier/orders/export`
Export orders to Excel/CSV.

**Query Parameters:**
- `format`: "csv" | "excel" (default: "csv")
- `status` (optional): Filter by status
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:** Binary file download (application/vnd.ms-excel or text/csv)

### Product Management Bulk Operations

#### POST `/api/supplier/products/bulk-update`
Bulk update products (prices, stock, status).

**Request:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "price_per_unit": 25.50,
    "stock_quantity": 100,
    "is_active": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "updated": 3,
  "products": [
    {
      "id": "uuid1",
      "name": "Product 1",
      "price_per_unit": 25.50
    }
  ]
}
```

#### POST `/api/supplier/products/import`
Import products from CSV/Excel.

**Request:** `multipart/form-data`
```
file: products.csv
```

**CSV Format:**
```csv
name,name_en,category_id,price_per_unit,stock_quantity,unit,description,description_en
إسمنت أبيض,White Cement,uuid,25.50,100,كيس 50 كغ,إسمنت عالي الجودة,High quality cement
```

**Response:**
```json
{
  "success": true,
  "imported": 45,
  "skipped": 2,
  "errors": [
    {
      "row": 3,
      "error": "Invalid category_id"
    }
  ]
}
```

#### GET `/api/supplier/products/export`
Export products to CSV/Excel.

**Query Parameters:**
- `format`: "csv" | "excel" (default: "csv")
- `category` (optional): Filter by category
- `status` (optional): "active" | "inactive"

**Response:** Binary file download

#### POST `/api/supplier/products/[id]/duplicate`
Duplicate product with smart naming.

**Request:**
```json
{
  "suffix": "- نسخة 2"
}
```

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "new-uuid",
    "name": "إسمنت أبيض - نسخة 2",
    "name_en": "White Cement - Copy 2",
    "price_per_unit": 25.50,
    "stock_quantity": 0
  }
}
```

### Tag Management

#### GET `/api/supplier/tags`
Get all tags for current supplier.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "urgent",
    "color": "#FF0000",
    "usage_count": 15,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### POST `/api/supplier/tags`
Create new tag.

**Request:**
```json
{
  "name": "high-value",
  "color": "#FFD700"
}
```

**Response:**
```json
{
  "success": true,
  "tag": {
    "id": "uuid",
    "name": "high-value",
    "color": "#FFD700"
  }
}
```

#### DELETE `/api/supplier/tags/[tagId]`
Delete tag.

**Response:**
```json
{
  "success": true,
  "message": "Tag deleted"
}
```

### Communications

#### GET `/api/supplier/communications`
Get communication history with contractors.

**Query Parameters:**
- `contractorId` (optional): Filter by contractor
- `orderId` (optional): Filter by order
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "communications": [
    {
      "id": "uuid",
      "contractor_id": "uuid",
      "contractor_name": "أحمد محمود",
      "order_id": "uuid",
      "order_number": "ORD-2025-001",
      "type": "order_inquiry",
      "subject": "استفسار عن التوصيل",
      "message": "متى سيتم التوصيل؟",
      "created_at": "2025-01-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### GET `/api/orders/[id]/messages`
Get messages for specific order.

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "متى سيتم التوصيل؟",
      "sender_id": "uuid",
      "sender_name": "أحمد محمود",
      "sender_role": "contractor",
      "created_at": "2025-01-11T10:00:00Z",
      "read_at": null
    }
  ]
}
```

### Analytics

#### GET `/api/supplier/analytics`
Get supplier analytics dashboard data.

**Query Parameters:**
- `period`: "7d" | "30d" | "90d" | "1y" (default: "30d")

**Response:**
```json
{
  "revenue": {
    "total": 45000.00,
    "trend": [
      { "date": "2025-01-01", "amount": 1200.00 },
      { "date": "2025-01-02", "amount": 1500.00 }
    ]
  },
  "orders": {
    "total": 150,
    "byStatus": {
      "completed": 140,
      "in_delivery": 5,
      "pending": 3,
      "cancelled": 2
    }
  },
  "topProducts": [
    {
      "product_id": "uuid",
      "name": "إسمنت أبيض",
      "revenue": 12500.00,
      "units_sold": 500
    }
  ],
  "deliverySuccessRate": 98.5
}
```

### Notifications

#### GET `/api/supplier/notifications`
Get in-app notifications for supplier.

**Query Parameters:**
- `unreadOnly`: boolean (default: false)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "new_order",
      "title": "طلب جديد",
      "message": "لديك طلب جديد #ORD-2025-001",
      "data": {
        "order_id": "uuid",
        "order_number": "ORD-2025-001"
      },
      "read_at": null,
      "created_at": "2025-01-11T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

#### POST `/api/supplier/notifications/preferences`
Update notification preferences.

**Request:**
```json
{
  "email_enabled": true,
  "sms_enabled": false,
  "push_enabled": true,
  "notification_types": {
    "new_order": true,
    "low_stock": true,
    "delivery_completed": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "preferences": { ... }
}
```

#### POST `/api/messages/[id]/read`
Mark message as read.

**Response:**
```json
{
  "success": true,
  "message_id": "uuid",
  "read_at": "2025-01-11T10:30:00Z"
}
```

### Admin Endpoints

#### GET `/api/admin/dashboard/stats`
Get admin dashboard statistics.

**Response:**
```json
{
  "totalOrders": 1250,
  "totalRevenue": 450000.00,
  "activeSuppliers": 25,
  "activeContractors": 350,
  "pendingDisputes": 3,
  "revenueGrowth": 15.5,
  "ordersGrowth": 12.3
}
```

#### GET `/api/admin/dashboard/activity-feed`
Get recent platform activity.

**Query Parameters:**
- `limit`: number (default: 50)

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "order_created",
      "description": "New order #ORD-2025-001 created",
      "actor": "أحمد محمود",
      "timestamp": "2025-01-11T10:00:00Z",
      "metadata": {
        "order_id": "uuid",
        "amount": 350.00
      }
    }
  ]
}
```

#### POST `/api/admin/orders/bulk-update`
Bulk update orders (admin only).

**Request:**
```json
{
  "orderIds": ["uuid1", "uuid2"],
  "updates": {
    "status": "cancelled",
    "admin_notes": "Bulk cancellation due to system issue"
  }
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2
}
```

#### GET `/api/admin/orders/search`
Advanced order search (admin only).

**Query Parameters:**
- `q`: Search query
- `status`: Filter by status
- `supplierId`: Filter by supplier
- `contractorId`: Filter by contractor
- `minAmount`: Minimum order amount
- `maxAmount`: Maximum order amount
- `startDate`: Orders from date
- `endDate`: Orders to date
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### GET `/api/admin/orders/export`
Export orders to Excel/CSV (admin only).

**Query Parameters:** Same as search endpoint + `format`

**Response:** Binary file download

---

## Standard Error Responses

**Updated**: January 13, 2025 - All critical endpoints now use standardized `ApiError` format with bilingual messages.

### Error Response Structure
All API errors follow this standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "English error message",
    "message_ar": "رسالة الخطأ بالعربية",
    "details": {
      "field": "fieldName",
      "issue": "specific issue description"
    },
    "timestamp": "2025-01-13T10:30:00.000Z",
    "request_id": "optional-trace-id"
  }
}
```

### Error Codes
Standardized error codes used across all endpoints:

- `VALIDATION_ERROR` - Input validation failed (400)
- `UNAUTHORIZED` - Authentication required or failed (401)
- `FORBIDDEN` - Insufficient permissions (403)
- `NOT_FOUND` - Resource not found (404)
- `BUSINESS_RULE_VIOLATION` - Business logic constraint violated (422)
- `DATABASE_ERROR` - Database operation failed (500)
- `INTERNAL_ERROR` - Unexpected server error (500)
- `PAYMENT_PROVIDER_ERROR` - External payment service error (502)

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed: PIN must be exactly 4 digits",
    "message_ar": "رمز PIN يجب أن يكون 4 أرقام",
    "details": {
      "field": "pin",
      "issue": "PIN must be exactly 4 digits"
    },
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "message_ar": "يجب تسجيل الدخول",
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this delivery",
    "message_ar": "غير مصرح لك بتأكيد هذا التوصيل",
    "details": {
      "reason": "Unauthorized supplier access"
    },
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Delivery not found",
    "message_ar": "التوصيل غير موجود",
    "details": {
      "resource": "Delivery",
      "id": "uuid-here"
    },
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

### 422 Business Rule Violation
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Maximum PIN attempts (3) exceeded",
    "message_ar": "تجاوزت الحد الأقصى لمحاولات PIN",
    "details": {
      "max_attempts": 3,
      "current_attempts": 3
    },
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database operation failed: update delivery",
    "message_ar": "فشل تحديث التوصيل",
    "details": {
      "error": "connection timeout"
    },
    "timestamp": "2025-01-13T10:30:00.000Z"
  }
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

---

## Changelog

### January 13, 2025 - API Stability & Validation Improvements ✅

**Status**: Production deployed

**Enhanced Endpoints** (5 critical routes):

#### 1. POST `/api/orders` - Order Creation
**Validation Added**:
```typescript
{
  supplierId: string (UUID format)
  items: Array<{
    productId: string (UUID format)
    quantity: number (positive integer)
    unitPrice: number (positive)
  }> (min 1 item)
  deliveryAddress: {
    address: string (min 10 chars)
    phone: string (regex: /^\+?[0-9]{10,15}$/)
    latitude: number (-90 to 90)
    longitude: number (-180 to 180)
  }
  deliverySchedule: {
    date: string (YYYY-MM-DD format)
    time_slot: string (required)
  }
  vehicleEstimate: {
    delivery_zone: "zone_a" | "zone_b"
    delivery_fee_jod: number (non-negative)
  }
}
```

**Error Handling**:
- Validation errors return proper field-level details
- Transaction rollback on failure (deletes order, items, delivery, payment records)
- Bilingual error messages for all failure scenarios

**Response Changes**:
- Added `created_at` timestamp to order object
- Improved error details for payment provider failures

---

#### 2. POST `/api/orders/[orderId]/confirm-delivery` - Contractor Delivery Confirmation
**Validation Added**:
```typescript
{
  confirmed: boolean (required)
  issues?: string (required if confirmed === false)
}
```

**Custom Validation**:
- If `confirmed === false`, `issues` field is mandatory
- Returns error: "Issues description is required when reporting problems"

**Business Logic**:
- Validates order status is `awaiting_contractor_confirmation`
- Checks supplier has confirmed first
- If confirmed:
  - Sets `contractor_confirmed = true`
  - Updates order status to `delivered`
  - Releases payment if no disputes
  - Sets final status to `completed` when payment released
- If not confirmed (dispute):
  - Creates dispute record with `status = 'opened'`
  - Sets order status to `disputed`
  - Freezes payment (keeps as `held`)
  - Creates order activity log

**Error Codes Added**:
- `BUSINESS_RULE_VIOLATION` - When supplier hasn't confirmed first
- `BUSINESS_RULE_VIOLATION` - When contractor already confirmed
- `BUSINESS_RULE_VIOLATION` - When order status is incorrect

---

#### 3. POST `/api/deliveries/confirm-photo` - Supplier Photo Confirmation
**Validation Added**:
```typescript
{
  deliveryId: string (UUID format)
  photoUrl: string (valid URL, min 1 char)
}
```

**Security Checks**:
- Authenticates user via JWT
- Verifies supplier owns the delivery's order
- Checks delivery not already confirmed

**Response**:
```json
{
  "success": true,
  "message": "تم تأكيد التوصيل من جانبك بنجاح. في انتظار تأكيد العميل لاستلام الطلب.",
  "message_en": "Delivery confirmed successfully. Waiting for customer confirmation.",
  "data": {
    "order_id": "uuid",
    "delivery_id": "uuid",
    "status": "awaiting_contractor_confirmation",
    "supplier_confirmed": true,
    "contractor_confirmed": false,
    "photo_url": "https://..."
  }
}
```

**Activity Logging**:
- Creates `order_activities` record with type `delivery_confirmed_supplier`
- Includes photo URL in metadata

---

#### 4. POST `/api/deliveries/verify-pin` - Supplier PIN Verification
**Validation Added**:
```typescript
{
  deliveryId: string (UUID format)
  pin: string (exactly 4 digits, regex: /^\d{4}$/)
}
```

**Security Features**:
- Maximum 3 PIN attempts per delivery (enforced)
- Increments `pin_attempts` on each failure
- Returns remaining attempts in error response

**Error Responses**:
```json
// Incorrect PIN
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Incorrect PIN code",
    "message_ar": "رمز PIN غير صحيح",
    "details": {
      "remaining_attempts": 2,
      "current_attempts": 1
    }
  }
}

// Max attempts exceeded
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Maximum PIN attempts (3) exceeded",
    "message_ar": "تجاوزت الحد الأقصى لمحاولات PIN",
    "details": {
      "max_attempts": 3,
      "current_attempts": 3
    }
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "تم تأكيد التوصيل من جانبك بنجاح. في انتظار تأكيد العميل لاستلام الطلب.",
  "message_en": "Delivery confirmed successfully. Waiting for customer confirmation.",
  "data": {
    "order_id": "uuid",
    "delivery_id": "uuid",
    "status": "awaiting_contractor_confirmation",
    "supplier_confirmed": true,
    "contractor_confirmed": false,
    "pin_verified": true
  }
}
```

---

#### 5. POST `/api/vehicle-estimate` - Delivery Fee Calculation
**Validation Added**:
```typescript
{
  supplierId: string (UUID format)
  deliveryLat: number (-90 to 90)
  deliveryLng: number (-180 to 180)
}
```

**Enhanced Error Handling**:
```json
// Outside service area
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Delivery location is outside the supplier service area",
    "message_ar": "موقع التوصيل خارج منطقة خدمة المورد",
    "details": {
      "error": "Distance exceeds maximum radius for zone"
    }
  }
}

// Zone not configured
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Supplier has not configured delivery fees for this zone",
    "message_ar": "لم يقم المورد بتكوين رسوم التوصيل لهذه المنطقة",
    "details": {
      "error": "No zone_fees record found for supplier and zone"
    }
  }
}

// Supplier not found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Supplier not found or not verified",
    "message_ar": "المورد غير موجود أو غير موثق",
    "details": {
      "resource": "Supplier",
      "id": "uuid",
      "error": "Supplier account is inactive or pending verification"
    }
  }
}
```

**Response Validation**:
- Validates estimate structure before returning
- Ensures zone, delivery_fee_jod, and distance_km are present and correct types

---

### Migration Applied

**Migration**: `20251113000001_remove_accepted_status_safe.sql`
**Applied**: January 13, 2025
**Status**: ✅ Production verified

**Changes**:
- Removed redundant `accepted` order status from `order_status` enum
- All orders now use simplified status flow
- `disputed` status now available for contractor delivery confirmation

**Status Flow**:
```
pending → confirmed → in_delivery → awaiting_contractor_confirmation → delivered → completed

Branch flows:
- cancelled (from pending or confirmed)
- rejected (supplier rejects order)
- disputed (contractor reports issue during confirmation)
```

---

### Technical Improvements

1. **Type Safety**:
   - All endpoints use Zod for runtime validation
   - Removed 'as any' type assertions
   - Fixed TypeScript readonly property errors

2. **Error Standardization**:
   - Consistent error codes across all endpoints
   - HTTP status codes properly mapped to business errors
   - All errors include bilingual messages (Arabic/English)

3. **Security**:
   - PIN attempt limiting (max 3 attempts)
   - Ownership verification on all delivery endpoints
   - Authentication checks on protected routes

4. **Audit Trail**:
   - Order activity logging on all state changes
   - Metadata includes relevant context (photo URLs, PIN verification, etc.)

5. **Code Quality**:
   - Transaction-like rollback mechanism for order creation
   - Centralized error handling utilities
   - Consistent validation patterns

---

*Last updated:* January 13, 2025
*Maintained by:* Contractors Mall Development Team