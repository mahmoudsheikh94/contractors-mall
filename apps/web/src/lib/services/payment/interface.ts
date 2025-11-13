/**
 * Payment Provider Interface
 * ==========================
 * Abstract interface that all payment providers must implement
 */

import {
  PaymentIntent,
  PaymentTransaction,
  PaymentCustomer,
  CardToken,
  PaymentStatus,
  PaymentWebhookEvent,
  RefundRequest,
  PaymentReceipt,
  ThreeDSecure,
  PaymentProviderConfig,
  EscrowHold
} from './types'

/**
 * Main payment provider interface
 * All payment providers (HyperPay, PayTabs, etc.) must implement this
 */
export interface IPaymentProvider {
  // Provider identification
  readonly name: string
  readonly version: string
  readonly config: PaymentProviderConfig

  // Initialization
  initialize(config: PaymentProviderConfig): Promise<void>
  validateConfig(): boolean

  // Payment Intent Management
  createPaymentIntent(params: {
    amount: number                    // In fils (1 JOD = 1000 fils)
    currency: string
    customer: PaymentCustomer
    description?: string
    metadata?: Record<string, any>
    returnUrl?: string               // For 3D Secure redirect
  }): Promise<PaymentIntent>

  retrievePaymentIntent(intentId: string): Promise<PaymentIntent>

  updatePaymentIntent(
    intentId: string,
    updates: Partial<PaymentIntent>
  ): Promise<PaymentIntent>

  cancelPaymentIntent(intentId: string): Promise<void>

  // Card Tokenization
  tokenizeCard(params: {
    cardNumber: string
    expiryMonth: number
    expiryYear: number
    cvv: string
    holderName?: string
    customerId: string
  }): Promise<CardToken>

  retrieveCardToken(tokenId: string): Promise<CardToken>

  listCustomerCards(customerId: string): Promise<CardToken[]>

  deleteCardToken(tokenId: string): Promise<void>

  // Payment Processing
  authorizePayment(params: {
    paymentIntentId: string
    cardTokenId?: string
    cvv?: string                     // For saved cards
    threeDSecure?: boolean
    saveCard?: boolean
    customerIp?: string
    userAgent?: string
  }): Promise<{
    transaction: PaymentTransaction
    threeDSecure?: ThreeDSecure
  }>

  capturePayment(params: {
    transactionId: string
    amount?: number                   // Partial capture if less than authorized
    finalCapture?: boolean           // Is this the final capture?
  }): Promise<PaymentTransaction>

  // Escrow Operations
  holdInEscrow(params: {
    transactionId: string
    orderId: string
    supplierId: string
    holdDays: number                 // How many days to hold
    commission: number               // Platform commission percentage
  }): Promise<EscrowHold>

  releaseFromEscrow(params: {
    transactionId: string
    supplierId: string
    amount?: number                  // Partial release if specified
    commission: number               // Commission to deduct
  }): Promise<{
    supplierAmount: number
    platformAmount: number
    transaction: PaymentTransaction
  }>

  // Refund Operations
  refundPayment(params: {
    transactionId: string
    amount?: number                  // Partial refund if specified
    reason: string
    requestedBy: string
    metadata?: Record<string, any>
  }): Promise<PaymentTransaction>

  retrieveRefund(refundId: string): Promise<PaymentTransaction>

  // Transaction Management
  retrieveTransaction(transactionId: string): Promise<PaymentTransaction>

  listTransactions(params: {
    customerId?: string
    supplierId?: string
    status?: PaymentStatus
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<{
    transactions: PaymentTransaction[]
    total: number
    hasMore: boolean
  }>

  // Webhook Handling
  validateWebhookSignature(params: {
    payload: string | object
    signature: string
    timestamp?: string
  }): boolean

  parseWebhookEvent(
    payload: string | object
  ): Promise<PaymentWebhookEvent>

  handleWebhookEvent(
    event: PaymentWebhookEvent
  ): Promise<{
    success: boolean
    transaction?: PaymentTransaction
    action?: string
  }>

  // Receipt Generation
  generateReceipt(
    transactionId: string
  ): Promise<PaymentReceipt>

  // 3D Secure
  initiate3DSecure(params: {
    transactionId: string
    returnUrl: string
    customerIp: string
  }): Promise<ThreeDSecure>

  complete3DSecure(params: {
    transactionId: string
    paRes?: string                   // 3D Secure v1
    threeDSSessionData?: string      // 3D Secure v2
  }): Promise<PaymentTransaction>

  // Utility Methods
  validateCardNumber(cardNumber: string): boolean

  detectCardBrand(cardNumber: string): string

  formatAmount(amount: number): string

  parseAmount(formattedAmount: string): number

  // Health Check
  healthCheck(): Promise<{
    healthy: boolean
    latency: number
    message?: string
  }>

  // Reporting (Optional)
  getDailySummary?(date: Date): Promise<{
    totalTransactions: number
    totalAmount: number
    successRate: number
    averageAmount: number
  }>

  getSettlementReport?(params: {
    startDate: Date
    endDate: Date
    supplierId?: string
  }): Promise<{
    settlements: Array<{
      date: Date
      amount: number
      transactionCount: number
      status: string
    }>
    totalAmount: number
    totalTransactions: number
  }>
}

/**
 * Factory for creating payment provider instances
 */
export interface IPaymentProviderFactory {
  createProvider(
    type: 'hyperpay' | 'paytabs' | 'tap' | 'mock',
    config: PaymentProviderConfig
  ): IPaymentProvider
}

/**
 * Payment service that manages multiple providers
 */
export interface IPaymentService {
  // Provider management
  setProvider(provider: IPaymentProvider): void
  getProvider(): IPaymentProvider
  switchProvider(type: string): Promise<void>

  // High-level operations
  processOrder(params: {
    orderId: string
    amount: number
    customer: PaymentCustomer
    saveCard?: boolean
  }): Promise<PaymentTransaction>

  confirmDelivery(params: {
    orderId: string
    transactionId: string
    supplierId: string
  }): Promise<void>

  handleDispute(params: {
    orderId: string
    transactionId: string
    reason: string
    evidence?: any[]
  }): Promise<void>

  // Scheduled operations
  processScheduledReleases(): Promise<{
    released: number
    failed: number
    errors: string[]
  }>

  processScheduledRefunds(): Promise<{
    refunded: number
    failed: number
    errors: string[]
  }>
}