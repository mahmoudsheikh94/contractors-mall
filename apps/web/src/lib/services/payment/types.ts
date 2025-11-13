/**
 * Payment Provider Types and Interfaces
 * ======================================
 * Core types for payment processing in Contractors Mall
 */

// Payment statuses aligned with order flow
export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',      // Payment authorized but not captured (held in escrow)
  CAPTURED = 'captured',          // Payment captured from customer
  RELEASED = 'released',          // Payment released to supplier
  REFUNDED = 'refunded',          // Payment refunded to customer
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Payment methods
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  BANK_TRANSFER = 'bank_transfer',
  EFAWATEER = 'efawateer',        // Jordan local payment
  CLIQ = 'cliq'                   // Jordan instant payment
}

// Card brands
export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  JCB = 'jcb',
  UNKNOWN = 'unknown'
}

// Customer information
export interface PaymentCustomer {
  id: string
  email: string
  phone: string
  name: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  country?: string
  postalCode?: string
}

// Card tokenization
export interface CardToken {
  id: string
  brand: CardBrand
  last4: string
  expiryMonth: number
  expiryYear: number
  holderName?: string
  fingerprint?: string           // Unique card identifier
  isDefault?: boolean
}

// Payment intent (before payment is made)
export interface PaymentIntent {
  id: string
  amount: number                  // In fils (1 JOD = 1000 fils)
  currency: string                // 'JOD'
  status: PaymentStatus
  description?: string
  metadata?: Record<string, any>
  customer: PaymentCustomer
  paymentMethod?: PaymentMethod
  cardToken?: CardToken
  createdAt: Date
  expiresAt?: Date
  clientSecret?: string          // For client-side confirmation
}

// Payment transaction (completed payment)
export interface PaymentTransaction {
  id: string
  paymentIntentId: string
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
  cardDetails?: {
    brand: CardBrand
    last4: string
    authCode?: string
  }
  customer: PaymentCustomer
  orderId: string
  supplierId?: string
  escrowReleaseDate?: Date
  refundedAmount?: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  pspTransactionId: string      // PSP's transaction ID
  pspResponse?: any              // Raw PSP response
}

// Webhook event from PSP
export interface PaymentWebhookEvent {
  id: string
  type: PaymentWebhookEventType
  data: any
  signature?: string
  timestamp: Date
}

export enum PaymentWebhookEventType {
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  DISPUTE_CREATED = 'dispute.created',
  DISPUTE_RESOLVED = 'dispute.resolved'
}

// Escrow operations
export interface EscrowHold {
  transactionId: string
  amount: number
  orderId: string
  supplierId: string
  holdUntil: Date                // Expected release date
  status: 'held' | 'released' | 'refunded'
  commission: number             // Platform commission amount
  netAmount: number              // Amount to supplier after commission
}

// Refund request
export interface RefundRequest {
  transactionId: string
  amount: number                  // Amount to refund (in fils)
  reason: string
  requestedBy: string            // User ID
  metadata?: Record<string, any>
}

// Payment provider configuration
export interface PaymentProviderConfig {
  provider: 'hyperpay' | 'paytabs' | 'tap' | 'mock'
  environment: 'sandbox' | 'production'
  merchantId?: string
  apiKey?: string
  secretKey?: string
  webhookSecret?: string
  entityId?: string              // HyperPay specific
  profileId?: string             // PayTabs specific
  publicKey?: string             // For client-side tokenization
}

// Error types
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

export enum PaymentErrorCode {
  INVALID_CARD = 'invalid_card',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  CARD_DECLINED = 'card_declined',
  EXPIRED_CARD = 'expired_card',
  INVALID_CVV = 'invalid_cvv',
  FRAUD_SUSPECTED = 'fraud_suspected',
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  INVALID_AMOUNT = 'invalid_amount',
  PROVIDER_ERROR = 'provider_error',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error',
  WEBHOOK_VERIFICATION_FAILED = 'webhook_verification_failed'
}

// 3D Secure authentication
export interface ThreeDSecure {
  required: boolean
  version: '1.0' | '2.0'
  status: 'pending' | 'authenticated' | 'failed'
  redirectUrl?: string
  challengeUrl?: string
  transactionId?: string
}

// Payment receipt
export interface PaymentReceipt {
  transactionId: string
  receiptNumber: string
  date: Date
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  cardDetails?: {
    brand: CardBrand
    last4: string
  }
  customer: PaymentCustomer
  supplier: {
    name: string
    taxNumber?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  tax: number
  deliveryFee: number
  total: number
  status: PaymentStatus
}