/**
 * Notification Service Types
 * ==========================
 * Types for email, SMS, and push notifications
 */

// Notification channels
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

// Notification types
export enum NotificationType {
  // Order notifications
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_STATUS_UPDATE = 'order_status_update',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_READY_FOR_DELIVERY = 'order_ready_for_delivery',

  // Delivery notifications
  DELIVERY_STARTED = 'delivery_started',
  DELIVERY_PIN = 'delivery_pin',
  DELIVERY_CONFIRMED = 'delivery_confirmed',
  DELIVERY_FAILED = 'delivery_failed',

  // Payment notifications
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  PAYMENT_RELEASED = 'payment_released',

  // Dispute notifications
  DISPUTE_CREATED = 'dispute_created',
  DISPUTE_UPDATED = 'dispute_updated',
  DISPUTE_RESOLVED = 'dispute_resolved',
  DISPUTE_ESCALATED = 'dispute_escalated',

  // Supplier notifications
  NEW_ORDER = 'new_order',
  ORDER_ACCEPTED = 'order_accepted',
  ORDER_REJECTED = 'order_rejected',
  SETTLEMENT_PROCESSED = 'settlement_processed',
  LOW_STOCK_ALERT = 'low_stock_alert',

  // Account notifications
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_VERIFIED = 'account_verified',

  // Admin notifications
  NEW_SUPPLIER_REGISTRATION = 'new_supplier_registration',
  HIGH_VALUE_DISPUTE = 'high_value_dispute',
  SYSTEM_ALERT = 'system_alert'
}

// Notification priority
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Notification status
export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed'
}

// Base notification
export interface Notification {
  id?: string
  type: NotificationType
  channel: NotificationChannel
  priority: NotificationPriority
  recipient: NotificationRecipient
  data: Record<string, any>
  scheduledFor?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

// Recipient information
export interface NotificationRecipient {
  id: string
  email?: string
  phone?: string
  name?: string
  language?: 'ar' | 'en'
  timezone?: string
  deviceTokens?: string[]
}

// Email notification
export interface EmailNotification extends Notification {
  channel: NotificationChannel.EMAIL
  subject: string
  template?: string
  html?: string
  text?: string
  attachments?: EmailAttachment[]
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  from?: {
    email: string
    name?: string
  }
}

// Email attachment
export interface EmailAttachment {
  filename: string
  content?: string | Buffer
  path?: string
  contentType?: string
  encoding?: string
}

// SMS notification
export interface SMSNotification extends Notification {
  channel: NotificationChannel.SMS
  message: string
  sender?: string
  unicode?: boolean
  flash?: boolean
}

// Push notification
export interface PushNotification extends Notification {
  channel: NotificationChannel.PUSH
  title: string
  body: string
  icon?: string
  image?: string
  badge?: number
  sound?: string
  data?: Record<string, any>
  actions?: PushAction[]
}

// Push action
export interface PushAction {
  action: string
  title: string
  icon?: string
}

// Notification template
export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  channel: NotificationChannel
  language: 'ar' | 'en'
  subject?: string
  content: string
  variables: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Notification preferences
export interface NotificationPreferences {
  userId: string
  email: {
    enabled: boolean
    types: NotificationType[]
    frequency?: 'instant' | 'daily' | 'weekly'
  }
  sms: {
    enabled: boolean
    types: NotificationType[]
    quietHours?: {
      start: string // "22:00"
      end: string   // "08:00"
    }
  }
  push: {
    enabled: boolean
    types: NotificationType[]
  }
  language: 'ar' | 'en'
  timezone: string
}

// Notification log
export interface NotificationLog {
  id: string
  notificationId: string
  type: NotificationType
  channel: NotificationChannel
  recipient: string
  status: NotificationStatus
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  errorMessage?: string
  providerResponse?: any
  retryCount: number
  maxRetries: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Notification batch
export interface NotificationBatch {
  id: string
  name?: string
  notifications: Notification[]
  scheduledFor?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: {
    total: number
    sent: number
    failed: number
  }
  createdAt: Date
  completedAt?: Date
}

// Provider configuration
export interface NotificationProviderConfig {
  email?: {
    provider: 'sendgrid' | 'resend' | 'smtp'
    apiKey?: string
    from: {
      email: string
      name: string
    }
    replyTo?: string
    sandboxMode?: boolean
  }
  sms?: {
    provider: 'twilio' | 'vonage' | 'sns'
    accountSid?: string
    authToken?: string
    from: string
    sandboxMode?: boolean
  }
  push?: {
    provider: 'firebase' | 'onesignal' | 'expo'
    serverKey?: string
    appId?: string
    sandboxMode?: boolean
  }
}

// Queue job data
export interface NotificationJob {
  id: string
  notification: Notification
  attempts: number
  maxAttempts: number
  nextAttempt?: Date
  lastError?: string
  createdAt: Date
}

// Delivery report
export interface DeliveryReport {
  notificationId: string
  channel: NotificationChannel
  status: NotificationStatus
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  bouncedAt?: Date
  unsubscribedAt?: Date
  errorCode?: string
  errorMessage?: string
  providerMessageId?: string
}

// Error types
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'NotificationError'
  }
}

export enum NotificationErrorCode {
  INVALID_RECIPIENT = 'invalid_recipient',
  INVALID_TEMPLATE = 'invalid_template',
  PROVIDER_ERROR = 'provider_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_PHONE_NUMBER = 'invalid_phone_number',
  INVALID_EMAIL_ADDRESS = 'invalid_email_address',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  BLOCKED = 'blocked',
  CONFIGURATION_ERROR = 'configuration_error'
}

// Template variables for each notification type
export const TEMPLATE_VARIABLES: Record<NotificationType, string[]> = {
  [NotificationType.ORDER_CONFIRMATION]: [
    'orderNumber', 'customerName', 'supplierName', 'totalAmount',
    'deliveryDate', 'deliveryAddress', 'items', 'orderUrl'
  ],
  [NotificationType.ORDER_STATUS_UPDATE]: [
    'orderNumber', 'customerName', 'oldStatus', 'newStatus',
    'statusMessage', 'orderUrl'
  ],
  [NotificationType.DELIVERY_PIN]: [
    'orderNumber', 'pin', 'driverName', 'driverPhone',
    'estimatedTime'
  ],
  [NotificationType.PAYMENT_SUCCESS]: [
    'orderNumber', 'amount', 'paymentMethod', 'transactionId',
    'receiptUrl'
  ],
  [NotificationType.DISPUTE_CREATED]: [
    'orderNumber', 'disputeId', 'reason', 'customerName',
    'disputeUrl'
  ],
  [NotificationType.NEW_ORDER]: [
    'orderNumber', 'customerName', 'totalAmount', 'itemCount',
    'deliveryDate', 'orderUrl'
  ],
  [NotificationType.SETTLEMENT_PROCESSED]: [
    'settlementId', 'period', 'amount', 'transactionCount',
    'settlementUrl'
  ],
  [NotificationType.WELCOME]: [
    'userName', 'userEmail', 'activationUrl'
  ],
  [NotificationType.EMAIL_VERIFICATION]: [
    'userName', 'verificationUrl', 'verificationCode'
  ],
  [NotificationType.PASSWORD_RESET]: [
    'userName', 'resetUrl', 'resetCode', 'expiresIn'
  ],
  // ... add variables for other types
  [NotificationType.ORDER_CANCELLED]: [],
  [NotificationType.ORDER_READY_FOR_DELIVERY]: [],
  [NotificationType.DELIVERY_STARTED]: [],
  [NotificationType.DELIVERY_CONFIRMED]: [],
  [NotificationType.DELIVERY_FAILED]: [],
  [NotificationType.PAYMENT_FAILED]: [],
  [NotificationType.PAYMENT_REFUNDED]: [],
  [NotificationType.PAYMENT_RELEASED]: [],
  [NotificationType.DISPUTE_UPDATED]: [],
  [NotificationType.DISPUTE_RESOLVED]: [],
  [NotificationType.DISPUTE_ESCALATED]: [],
  [NotificationType.ORDER_ACCEPTED]: [],
  [NotificationType.ORDER_REJECTED]: [],
  [NotificationType.LOW_STOCK_ALERT]: [],
  [NotificationType.ACCOUNT_SUSPENDED]: [],
  [NotificationType.ACCOUNT_VERIFIED]: [],
  [NotificationType.NEW_SUPPLIER_REGISTRATION]: [],
  [NotificationType.HIGH_VALUE_DISPUTE]: [],
  [NotificationType.SYSTEM_ALERT]: []
}