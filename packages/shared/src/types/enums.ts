/**
 * Centralized Enum Type Definitions
 * This file is the single source of truth for all enum types used across the application.
 * These types MUST match the database enum definitions exactly.
 */

// ============================================
// User & Authentication Enums
// ============================================

export type UserRole = 'contractor' | 'supplier_admin' | 'driver' | 'admin'

export type PreferredLanguage = 'ar' | 'en'

// ============================================
// Order Related Enums
// ============================================

/**
 * Order Status Enum
 * Based on migration 20251113000000_remove_accepted_status.sql (latest)
 */
export type OrderStatus =
  | 'pending'                           // Initial state when order is created
  | 'confirmed'                         // Payment has been held in escrow
  | 'in_delivery'                       // Supplier has started delivery
  | 'delivered'                         // Supplier has delivered (awaiting contractor confirmation)
  | 'awaiting_contractor_confirmation'  // Supplier confirmed, waiting for contractor
  | 'completed'                         // Both parties confirmed, payment released
  | 'cancelled'                         // Order was cancelled
  | 'rejected'                          // Supplier rejected the order
  | 'disputed'                          // Contractor opened a dispute

/**
 * Payment Status Enum
 * Based on migration 20241023000001_initial_schema.sql
 * NOTE: Database uses 'held' not 'escrow_held' in production
 */
export type PaymentStatus =
  | 'pending'      // Payment not yet processed
  | 'held'         // Payment held in escrow (NOTE: DB uses 'held' not 'escrow_held')
  | 'released'     // Payment released to supplier
  | 'refunded'     // Payment refunded to contractor
  | 'failed'       // Payment processing failed
  | 'frozen'       // Payment frozen due to dispute

/**
 * Dispute Status Enum
 */
export type DisputeStatus =
  | 'opened'        // Dispute just created
  | 'investigating' // Admin is investigating
  | 'resolved'      // Dispute resolved
  | 'escalated'     // Escalated for site visit

/**
 * Delivery Zone Enum
 */
export type DeliveryZone = 'zone_a' | 'zone_b'

// ============================================
// Invoice Related Enums
// ============================================

/**
 * Invoice Type Enum
 * Based on migration 20250113000000_create_invoicing_system.sql
 */
export type InvoiceType = 'income' | 'sales_tax' | 'special_tax'

export type InvoiceCategory = 'local' | 'export' | 'development_zone'

export type InvoiceStatus = 'draft' | 'issued' | 'submitted_to_portal' | 'cancelled'

export type SubmissionStatus = 'pending' | 'success' | 'failed'

export type BuyerIdType = 'national_id' | 'tax_number' | 'personal_number'

export type InvoiceItemType = 'product' | 'service' | 'service_allowance'

// ============================================
// Supplier Related Enums
// ============================================

/**
 * Supplier Verification Status
 * Note: This might be stored as a string field rather than enum in DB
 */
export type SupplierStatus = 'pending' | 'verified' | 'suspended' | 'rejected'

// ============================================
// Helper Type Guards
// ============================================

export const isValidOrderStatus = (status: string): status is OrderStatus => {
  const validStatuses: OrderStatus[] = [
    'pending', 'confirmed', 'in_delivery', 'delivered',
    'awaiting_contractor_confirmation', 'completed', 'cancelled',
    'rejected', 'disputed'
  ]
  return validStatuses.includes(status as OrderStatus)
}

export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  const validStatuses: PaymentStatus[] = [
    'pending', 'held', 'released', 'refunded', 'failed', 'frozen'
  ]
  return validStatuses.includes(status as PaymentStatus)
}

export const isValidUserRole = (role: string): role is UserRole => {
  const validRoles: UserRole[] = ['contractor', 'supplier_admin', 'driver', 'admin']
  return validRoles.includes(role as UserRole)
}

export const isValidDisputeStatus = (status: string): status is DisputeStatus => {
  const validStatuses: DisputeStatus[] = ['opened', 'investigating', 'resolved', 'escalated']
  return validStatuses.includes(status as DisputeStatus)
}

// ============================================
// Status Display Helpers (for UI)
// ============================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, { ar: string; en: string; color: string }> = {
  pending: { ar: 'معلق', en: 'Pending', color: 'yellow' },
  confirmed: { ar: 'تم تأكيد الطلب', en: 'Confirmed', color: 'blue' },
  in_delivery: { ar: 'قيد التوصيل', en: 'In Delivery', color: 'purple' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered', color: 'green' },
  awaiting_contractor_confirmation: { ar: 'في انتظار تأكيد المقاول', en: 'Awaiting Contractor Confirmation', color: 'orange' },
  completed: { ar: 'مكتمل', en: 'Completed', color: 'green' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: 'gray' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: 'red' },
  disputed: { ar: 'متنازع عليه', en: 'Disputed', color: 'red' }
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { ar: string; en: string; icon: string }> = {
  pending: { ar: 'معلق', en: 'Pending', icon: '⏳' },
  held: { ar: 'محجوز', en: 'Held in Escrow', icon: '🔒' },
  released: { ar: 'تم الإفراج', en: 'Released', icon: '✅' },
  refunded: { ar: 'مسترد', en: 'Refunded', icon: '↩️' },
  failed: { ar: 'فشل', en: 'Failed', icon: '❌' },
  frozen: { ar: 'مجمد', en: 'Frozen', icon: '🧊' }
}

export const USER_ROLE_LABELS: Record<UserRole, { ar: string; en: string }> = {
  contractor: { ar: 'مقاول', en: 'Contractor' },
  supplier_admin: { ar: 'مورد', en: 'Supplier' },
  driver: { ar: 'سائق', en: 'Driver' },
  admin: { ar: 'مدير', en: 'Admin' }
}

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, { ar: string; en: string; color: string }> = {
  opened: { ar: 'مفتوح', en: 'Opened', color: 'yellow' },
  investigating: { ar: 'قيد التحقيق', en: 'Investigating', color: 'blue' },
  resolved: { ar: 'تم الحل', en: 'Resolved', color: 'green' },
  escalated: { ar: 'تم التصعيد', en: 'Escalated', color: 'red' }
}