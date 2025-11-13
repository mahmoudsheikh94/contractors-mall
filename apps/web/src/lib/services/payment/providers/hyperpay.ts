/**
 * HyperPay Payment Provider Implementation
 * ========================================
 * Integration with HyperPay (PayFort) for Jordan market
 */

import { IPaymentProvider } from '../interface'
import {
  PaymentIntent,
  PaymentTransaction,
  PaymentCustomer,
  CardToken,
  PaymentStatus,
  PaymentWebhookEvent,
  PaymentReceipt,
  ThreeDSecure,
  PaymentProviderConfig,
  EscrowHold,
  PaymentError,
  PaymentErrorCode,
  CardBrand,
  PaymentMethod,
  PaymentWebhookEventType
} from '../types'
import crypto from 'crypto'

// HyperPay API endpoints
const API_ENDPOINTS = {
  sandbox: 'https://eu-test.oppwa.com',
  production: 'https://eu-prod.oppwa.com'
}

// HyperPay-specific types
interface HyperPayCheckout {
  id: string
  buildNumber: string
  timestamp: string
  ndc: string
  result: {
    code: string
    description: string
  }
}

interface HyperPayPayment {
  id: string
  paymentBrand: string
  paymentType: string
  amount: string
  currency: string
  descriptor: string
  merchantTransactionId: string
  result: {
    code: string
    description: string
  }
  resultDetails?: {
    ExtendedDescription?: string
    clearingInstituteName?: string
  }
  card?: {
    bin: string
    last4Digits: string
    holder: string
    expiryMonth: string
    expiryYear: string
  }
  customer?: {
    email: string
    phone: string
    givenName: string
    surname: string
  }
  customParameters?: Record<string, string>
  risk?: {
    score: string
  }
  buildNumber: string
  timestamp: string
  ndc: string
}

export class HyperPayProvider implements IPaymentProvider {
  public readonly name = 'HyperPay'
  public readonly version = '1.0.0'
  public config: PaymentProviderConfig

  private apiUrl: string
  private entityId: string
  private accessToken: string
  private webhookSecret: string

  constructor(config?: PaymentProviderConfig) {
    this.config = config || {
      provider: 'hyperpay',
      environment: 'sandbox'
    }

    this.apiUrl = API_ENDPOINTS[this.config.environment]
    this.entityId = ''
    this.accessToken = ''
    this.webhookSecret = ''
  }

  async initialize(config: PaymentProviderConfig): Promise<void> {
    this.config = config
    this.apiUrl = API_ENDPOINTS[config.environment]

    if (!config.entityId || !config.apiKey || !config.webhookSecret) {
      throw new PaymentError(
        'Missing required HyperPay configuration',
        PaymentErrorCode.CONFIGURATION_ERROR,
        500
      )
    }

    this.entityId = config.entityId
    this.accessToken = config.apiKey
    this.webhookSecret = config.webhookSecret

    // Validate configuration with a test request
    const isValid = await this.validateConfig()
    if (!isValid) {
      throw new PaymentError(
        'Invalid HyperPay configuration',
        PaymentErrorCode.CONFIGURATION_ERROR,
        500
      )
    }
  }

  validateConfig(): boolean {
    return !!(this.entityId && this.accessToken && this.apiUrl)
  }

  async createPaymentIntent(params: {
    amount: number
    currency: string
    customer: PaymentCustomer
    description?: string
    metadata?: Record<string, any>
    returnUrl?: string
  }): Promise<PaymentIntent> {
    try {
      // Create a checkout in HyperPay
      const response = await this.makeRequest('/v1/checkouts', 'POST', {
        entityId: this.entityId,
        amount: (params.amount / 1000).toFixed(3), // Convert fils to JOD
        currency: params.currency,
        paymentType: 'PA', // Pre-authorization for escrow
        merchantTransactionId: this.generateTransactionId(),
        customer: {
          email: params.customer.email,
          phone: params.customer.phone,
          givenName: params.customer.name.split(' ')[0],
          surname: params.customer.name.split(' ').slice(1).join(' ')
        },
        billing: {
          street1: params.customer.addressLine1,
          street2: params.customer.addressLine2,
          city: params.customer.city,
          country: params.customer.country || 'JO',
          postcode: params.customer.postalCode
        },
        customParameters: params.metadata,
        merchantInvoiceId: params.description
      })

      const checkout = response as HyperPayCheckout

      if (!this.isSuccessCode(checkout.result.code)) {
        throw new PaymentError(
          checkout.result.description,
          PaymentErrorCode.PROVIDER_ERROR,
          400,
          checkout.result
        )
      }

      return {
        id: checkout.id,
        amount: params.amount,
        currency: params.currency,
        status: PaymentStatus.PENDING,
        description: params.description,
        metadata: params.metadata,
        customer: params.customer,
        createdAt: new Date(checkout.timestamp),
        clientSecret: checkout.id // Used for widget initialization
      }
    } catch (error: any) {
      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to create payment intent',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async retrievePaymentIntent(intentId: string): Promise<PaymentIntent> {
    try {
      const response = await this.makeRequest(
        `/v1/checkouts/${intentId}/payment`,
        'GET'
      )

      const payment = response as HyperPayPayment

      return this.mapHyperPayToIntent(payment)
    } catch (error: any) {
      throw new PaymentError(
        'Failed to retrieve payment intent',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async updatePaymentIntent(
    intentId: string,
    updates: Partial<PaymentIntent>
  ): Promise<PaymentIntent> {
    // HyperPay doesn't support updating checkouts
    // We'll need to cancel and create a new one
    await this.cancelPaymentIntent(intentId)

    const currentIntent = await this.retrievePaymentIntent(intentId)

    return this.createPaymentIntent({
      amount: updates.amount || currentIntent.amount,
      currency: updates.currency || currentIntent.currency,
      customer: updates.customer || currentIntent.customer,
      description: updates.description || currentIntent.description,
      metadata: updates.metadata || currentIntent.metadata
    })
  }

  async cancelPaymentIntent(intentId: string): Promise<void> {
    // HyperPay doesn't have a direct cancel API
    // Checkouts expire automatically after 30 minutes
    // We'll mark it as cancelled in our database
    return Promise.resolve()
  }

  async tokenizeCard(params: {
    cardNumber: string
    expiryMonth: number
    expiryYear: number
    cvv: string
    holderName?: string
    customerId: string
  }): Promise<CardToken> {
    try {
      // Create a registration for recurring payments
      const response = await this.makeRequest('/v1/registrations', 'POST', {
        entityId: this.entityId,
        paymentBrand: this.detectCardBrand(params.cardNumber),
        card: {
          number: params.cardNumber,
          expiryMonth: params.expiryMonth.toString().padStart(2, '0'),
          expiryYear: params.expiryYear.toString(),
          cvv: params.cvv,
          holder: params.holderName || 'CARD HOLDER'
        },
        customer: {
          merchantCustomerId: params.customerId
        }
      })

      const registration = response as any

      if (!this.isSuccessCode(registration.result.code)) {
        throw new PaymentError(
          registration.result.description,
          PaymentErrorCode.INVALID_CARD,
          400,
          registration.result
        )
      }

      return {
        id: registration.id,
        brand: this.mapPaymentBrand(registration.paymentBrand),
        last4: registration.card.last4Digits,
        expiryMonth: parseInt(registration.card.expiryMonth),
        expiryYear: parseInt(registration.card.expiryYear),
        holderName: registration.card.holder,
        fingerprint: registration.card.bin
      }
    } catch (error: any) {
      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to tokenize card',
        PaymentErrorCode.INVALID_CARD,
        400,
        error
      )
    }
  }

  async retrieveCardToken(tokenId: string): Promise<CardToken> {
    try {
      const response = await this.makeRequest(
        `/v1/registrations/${tokenId}`,
        'GET'
      )

      const registration = response as any

      return {
        id: registration.id,
        brand: this.mapPaymentBrand(registration.paymentBrand),
        last4: registration.card.last4Digits,
        expiryMonth: parseInt(registration.card.expiryMonth),
        expiryYear: parseInt(registration.card.expiryYear),
        holderName: registration.card.holder,
        fingerprint: registration.card.bin
      }
    } catch (error: any) {
      throw new PaymentError(
        'Failed to retrieve card token',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async listCustomerCards(customerId: string): Promise<CardToken[]> {
    // HyperPay doesn't have a direct API to list customer cards
    // This would need to be managed in our database
    return []
  }

  async deleteCardToken(tokenId: string): Promise<void> {
    try {
      await this.makeRequest(
        `/v1/registrations/${tokenId}`,
        'DELETE'
      )
    } catch (error: any) {
      throw new PaymentError(
        'Failed to delete card token',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async authorizePayment(params: {
    paymentIntentId: string
    cardTokenId?: string
    cvv?: string
    threeDSecure?: boolean
    saveCard?: boolean
    customerIp?: string
    userAgent?: string
  }): Promise<{
    transaction: PaymentTransaction
    threeDSecure?: ThreeDSecure
  }> {
    try {
      const paymentData: any = {
        entityId: this.entityId,
        paymentType: 'PA', // Pre-authorization
        merchantTransactionId: this.generateTransactionId(),
        shopperResultUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/3ds-return`
      }

      if (params.cardTokenId) {
        // Use saved card
        paymentData.registrationId = params.cardTokenId
        if (params.cvv) {
          paymentData.card = { cvv: params.cvv }
        }
      }

      if (params.threeDSecure) {
        paymentData['3D.authenticated'] = true
      }

      const response = await this.makeRequest(
        `/v1/checkouts/${params.paymentIntentId}/payment`,
        'POST',
        paymentData
      )

      const payment = response as HyperPayPayment

      if (payment.result.code === '000.200.000') {
        // Transaction pending 3D Secure
        return {
          transaction: this.mapHyperPayToTransaction(payment),
          threeDSecure: {
            required: true,
            version: '2.0',
            status: 'pending',
            redirectUrl: payment.redirect?.url
          }
        }
      }

      if (!this.isSuccessCode(payment.result.code)) {
        throw new PaymentError(
          payment.result.description,
          this.mapErrorCode(payment.result.code),
          400,
          payment.result
        )
      }

      return {
        transaction: this.mapHyperPayToTransaction(payment)
      }
    } catch (error: any) {
      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to authorize payment',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async capturePayment(params: {
    transactionId: string
    amount?: number
    finalCapture?: boolean
  }): Promise<PaymentTransaction> {
    try {
      const response = await this.makeRequest('/v1/payments', 'POST', {
        entityId: this.entityId,
        paymentType: 'CP', // Capture
        amount: params.amount ? (params.amount / 1000).toFixed(3) : undefined,
        currency: 'JOD',
        paymentId: params.transactionId
      })

      const payment = response as HyperPayPayment

      if (!this.isSuccessCode(payment.result.code)) {
        throw new PaymentError(
          payment.result.description,
          this.mapErrorCode(payment.result.code),
          400,
          payment.result
        )
      }

      return this.mapHyperPayToTransaction(payment)
    } catch (error: any) {
      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to capture payment',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  // Implement remaining methods...

  async holdInEscrow(params: {
    transactionId: string
    orderId: string
    supplierId: string
    holdDays: number
    commission: number
  }): Promise<EscrowHold> {
    // HyperPay doesn't have built-in escrow
    // We manage this in our database
    const releaseDate = new Date()
    releaseDate.setDate(releaseDate.getDate() + params.holdDays)

    return {
      transactionId: params.transactionId,
      amount: 0, // Will be set from transaction
      orderId: params.orderId,
      supplierId: params.supplierId,
      holdUntil: releaseDate,
      status: 'held',
      commission: params.commission,
      netAmount: 0 // Will be calculated
    }
  }

  async releaseFromEscrow(params: {
    transactionId: string
    supplierId: string
    amount?: number
    commission: number
  }): Promise<{
    supplierAmount: number
    platformAmount: number
    transaction: PaymentTransaction
  }> {
    // Release is just a capture in HyperPay
    const transaction = await this.capturePayment({
      transactionId: params.transactionId,
      amount: params.amount,
      finalCapture: true
    })

    const totalAmount = params.amount || transaction.amount
    const platformAmount = Math.round(totalAmount * params.commission / 100)
    const supplierAmount = totalAmount - platformAmount

    return {
      supplierAmount,
      platformAmount,
      transaction
    }
  }

  async refundPayment(params: {
    transactionId: string
    amount?: number
    reason: string
    requestedBy: string
    metadata?: Record<string, any>
  }): Promise<PaymentTransaction> {
    try {
      const response = await this.makeRequest('/v1/payments', 'POST', {
        entityId: this.entityId,
        paymentType: 'RF', // Refund
        amount: params.amount ? (params.amount / 1000).toFixed(3) : undefined,
        currency: 'JOD',
        paymentId: params.transactionId,
        customParameters: {
          refundReason: params.reason,
          requestedBy: params.requestedBy,
          ...params.metadata
        }
      })

      const payment = response as HyperPayPayment

      if (!this.isSuccessCode(payment.result.code)) {
        throw new PaymentError(
          payment.result.description,
          this.mapErrorCode(payment.result.code),
          400,
          payment.result
        )
      }

      return this.mapHyperPayToTransaction(payment)
    } catch (error: any) {
      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to refund payment',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async retrieveRefund(refundId: string): Promise<PaymentTransaction> {
    return this.retrieveTransaction(refundId)
  }

  async retrieveTransaction(transactionId: string): Promise<PaymentTransaction> {
    try {
      const response = await this.makeRequest(
        `/v1/query/${transactionId}`,
        'GET'
      )

      const payment = response as HyperPayPayment

      return this.mapHyperPayToTransaction(payment)
    } catch (error: any) {
      throw new PaymentError(
        'Failed to retrieve transaction',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async listTransactions(params: {
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
  }> {
    // HyperPay doesn't have a transaction listing API
    // This would be managed in our database
    return {
      transactions: [],
      total: 0,
      hasMore: false
    }
  }

  validateWebhookSignature(params: {
    payload: string | object
    signature: string
    timestamp?: string
  }): boolean {
    const payloadString = typeof params.payload === 'string'
      ? params.payload
      : JSON.stringify(params.payload)

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payloadString)
      .digest('hex')

    return expectedSignature === params.signature
  }

  async parseWebhookEvent(
    payload: string | object
  ): Promise<PaymentWebhookEvent> {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload

    return {
      id: data.id || crypto.randomBytes(16).toString('hex'),
      type: this.mapWebhookType(data.type),
      data: data,
      timestamp: new Date(data.timestamp || Date.now())
    }
  }

  async handleWebhookEvent(
    event: PaymentWebhookEvent
  ): Promise<{
    success: boolean
    transaction?: PaymentTransaction
    action?: string
  }> {
    try {
      const payment = event.data as HyperPayPayment

      switch (event.type) {
        case PaymentWebhookEventType.PAYMENT_AUTHORIZED:
          return {
            success: true,
            transaction: this.mapHyperPayToTransaction(payment),
            action: 'authorized'
          }

        case PaymentWebhookEventType.PAYMENT_CAPTURED:
          return {
            success: true,
            transaction: this.mapHyperPayToTransaction(payment),
            action: 'captured'
          }

        case PaymentWebhookEventType.PAYMENT_REFUNDED:
          return {
            success: true,
            transaction: this.mapHyperPayToTransaction(payment),
            action: 'refunded'
          }

        default:
          return {
            success: true,
            action: 'ignored'
          }
      }
    } catch (error: any) {
      return {
        success: false,
        action: 'error'
      }
    }
  }

  async generateReceipt(
    transactionId: string
  ): Promise<PaymentReceipt> {
    const transaction = await this.retrieveTransaction(transactionId)

    return {
      transactionId: transaction.id,
      receiptNumber: `RCP-${transaction.id.substring(0, 8).toUpperCase()}`,
      date: transaction.createdAt,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      cardDetails: transaction.cardDetails,
      customer: transaction.customer,
      supplier: {
        name: 'Supplier Name', // Would come from database
        taxNumber: '123456789'
      },
      items: [], // Would come from order details
      subtotal: transaction.amount,
      tax: 0,
      deliveryFee: 0,
      total: transaction.amount,
      status: transaction.status
    }
  }

  async initiate3DSecure(params: {
    transactionId: string
    returnUrl: string
    customerIp: string
  }): Promise<ThreeDSecure> {
    // 3D Secure is initiated during authorization in HyperPay
    return {
      required: true,
      version: '2.0',
      status: 'pending',
      redirectUrl: `${this.apiUrl}/v1/checkouts/${params.transactionId}/3ds`,
      transactionId: params.transactionId
    }
  }

  async complete3DSecure(params: {
    transactionId: string
    paRes?: string
    threeDSSessionData?: string
  }): Promise<PaymentTransaction> {
    // Complete 3D Secure and get final payment status
    const response = await this.makeRequest(
      `/v1/checkouts/${params.transactionId}/payment`,
      'GET'
    )

    const payment = response as HyperPayPayment

    if (!this.isSuccessCode(payment.result.code)) {
      throw new PaymentError(
        payment.result.description,
        this.mapErrorCode(payment.result.code),
        400,
        payment.result
      )
    }

    return this.mapHyperPayToTransaction(payment)
  }

  validateCardNumber(cardNumber: string): boolean {
    // Luhn algorithm validation
    const digits = cardNumber.replace(/\D/g, '')
    let sum = 0
    let isEven = false

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10)

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  }

  detectCardBrand(cardNumber: string): string {
    const patterns = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
      jcb: /^(?:2131|1800|35\d{3})\d{11}$/
    }

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber.replace(/\D/g, ''))) {
        return brand.toUpperCase()
      }
    }

    return 'UNKNOWN'
  }

  formatAmount(amount: number): string {
    return `${(amount / 1000).toFixed(3)} JOD`
  }

  parseAmount(formattedAmount: string): number {
    const amount = parseFloat(formattedAmount.replace(/[^0-9.]/g, ''))
    return Math.round(amount * 1000)
  }

  async healthCheck(): Promise<{
    healthy: boolean
    latency: number
    message?: string
  }> {
    const startTime = Date.now()

    try {
      await this.makeRequest('/v1/checkouts/test', 'GET')

      return {
        healthy: true,
        latency: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        message: error.message
      }
    }
  }

  // Private helper methods

  private async makeRequest(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`

    const headers: any = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    const options: RequestInit = {
      method,
      headers
    }

    if (data && method !== 'GET') {
      options.body = new URLSearchParams(data).toString()
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json()

      if (!response.ok) {
        throw new PaymentError(
          result.message || 'Request failed',
          PaymentErrorCode.PROVIDER_ERROR,
          response.status,
          result
        )
      }

      return result
    } catch (error: any) {
      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Network request failed',
        PaymentErrorCode.NETWORK_ERROR,
        500,
        error
      )
    }
  }

  private isSuccessCode(code: string): boolean {
    // HyperPay success codes
    const successPatterns = [
      /^(000\.000\.|000\.100\.1|000\.[36])/,
      /^(000\.200)/,
      /^(000\.400\.0[^3]|000\.400\.100)/,
      /^(800\.400\.5|800\.400\.500)/
    ]

    return successPatterns.some(pattern => pattern.test(code))
  }

  private mapErrorCode(hyperPayCode: string): string {
    const codeMap: Record<string, string> = {
      '000.100.110': PaymentErrorCode.INVALID_CARD,
      '000.100.111': PaymentErrorCode.INVALID_CVV,
      '000.100.112': PaymentErrorCode.INVALID_CARD,
      '000.300.101': PaymentErrorCode.EXPIRED_CARD,
      '000.300.102': PaymentErrorCode.CARD_DECLINED,
      '000.300.103': PaymentErrorCode.INSUFFICIENT_FUNDS,
      '000.600.000': PaymentErrorCode.DUPLICATE_TRANSACTION,
      '100.100.101': PaymentErrorCode.INVALID_CARD,
      '100.100.201': PaymentErrorCode.EXPIRED_CARD,
      '100.100.303': PaymentErrorCode.EXPIRED_CARD,
      '100.100.500': PaymentErrorCode.FRAUD_SUSPECTED,
      '100.100.501': PaymentErrorCode.FRAUD_SUSPECTED,
      '100.100.600': PaymentErrorCode.INVALID_CVV,
      '100.100.601': PaymentErrorCode.INVALID_CVV,
      '100.100.700': PaymentErrorCode.INVALID_CARD,
      '100.100.701': PaymentErrorCode.INVALID_CARD,
      '100.380.401': PaymentErrorCode.CARD_DECLINED,
      '100.380.501': PaymentErrorCode.CARD_DECLINED,
      '100.390.103': PaymentErrorCode.FRAUD_SUSPECTED,
      '100.390.105': PaymentErrorCode.INSUFFICIENT_FUNDS,
      '100.390.106': PaymentErrorCode.CARD_DECLINED,
      '100.390.107': PaymentErrorCode.CARD_DECLINED,
      '100.390.111': PaymentErrorCode.CARD_DECLINED,
      '100.390.112': PaymentErrorCode.CARD_DECLINED,
      '100.390.113': PaymentErrorCode.FRAUD_SUSPECTED,
      '100.390.114': PaymentErrorCode.CARD_DECLINED,
      '100.390.115': PaymentErrorCode.CARD_DECLINED,
      '100.390.118': PaymentErrorCode.CARD_DECLINED,
      '800.100.100': PaymentErrorCode.CARD_DECLINED,
      '800.100.151': PaymentErrorCode.INVALID_CARD,
      '800.100.152': PaymentErrorCode.CARD_DECLINED,
      '800.100.153': PaymentErrorCode.INVALID_CVV,
      '800.100.154': PaymentErrorCode.EXPIRED_CARD,
      '800.100.155': PaymentErrorCode.INSUFFICIENT_FUNDS,
      '800.100.156': PaymentErrorCode.INVALID_CVV,
      '800.100.157': PaymentErrorCode.EXPIRED_CARD,
      '800.100.158': PaymentErrorCode.CARD_DECLINED,
      '800.100.159': PaymentErrorCode.CARD_DECLINED,
      '800.100.160': PaymentErrorCode.CARD_DECLINED,
      '800.100.161': PaymentErrorCode.CARD_DECLINED,
      '800.100.162': PaymentErrorCode.CARD_DECLINED,
      '800.100.163': PaymentErrorCode.CARD_DECLINED,
      '800.100.164': PaymentErrorCode.INSUFFICIENT_FUNDS,
      '800.100.165': PaymentErrorCode.CARD_DECLINED,
      '800.100.166': PaymentErrorCode.CARD_DECLINED,
      '800.100.167': PaymentErrorCode.CARD_DECLINED,
      '800.100.168': PaymentErrorCode.CARD_DECLINED,
      '800.100.169': PaymentErrorCode.EXPIRED_CARD,
      '800.100.170': PaymentErrorCode.CARD_DECLINED,
      '800.100.171': PaymentErrorCode.CARD_DECLINED,
      '800.100.172': PaymentErrorCode.INSUFFICIENT_FUNDS,
      '800.100.173': PaymentErrorCode.CARD_DECLINED,
      '800.100.174': PaymentErrorCode.CARD_DECLINED,
      '800.100.175': PaymentErrorCode.CARD_DECLINED,
      '800.100.176': PaymentErrorCode.CARD_DECLINED,
      '800.100.177': PaymentErrorCode.CARD_DECLINED,
      '800.100.178': PaymentErrorCode.CARD_DECLINED,
      '800.100.179': PaymentErrorCode.CARD_DECLINED,
      '800.100.190': PaymentErrorCode.CARD_DECLINED,
      '800.100.191': PaymentErrorCode.CARD_DECLINED,
      '800.100.192': PaymentErrorCode.CARD_DECLINED,
      '800.100.195': PaymentErrorCode.CARD_DECLINED,
      '800.100.196': PaymentErrorCode.CARD_DECLINED,
      '800.100.197': PaymentErrorCode.CARD_DECLINED,
      '800.100.198': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.100.199': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.110.100': PaymentErrorCode.CARD_DECLINED,
      '800.120.100': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.101': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.102': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.103': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.200': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.201': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.202': PaymentErrorCode.FRAUD_SUSPECTED,
      '800.120.203': PaymentErrorCode.FRAUD_SUSPECTED
    }

    return codeMap[hyperPayCode] || PaymentErrorCode.PROVIDER_ERROR
  }

  private mapPaymentBrand(hyperPayBrand: string): CardBrand {
    const brandMap: Record<string, CardBrand> = {
      'VISA': CardBrand.VISA,
      'MASTER': CardBrand.MASTERCARD,
      'MASTERCARD': CardBrand.MASTERCARD,
      'AMEX': CardBrand.AMEX,
      'DISCOVER': CardBrand.DISCOVER,
      'JCB': CardBrand.JCB
    }

    return brandMap[hyperPayBrand.toUpperCase()] || CardBrand.UNKNOWN
  }

  private mapHyperPayToIntent(payment: HyperPayPayment): PaymentIntent {
    return {
      id: payment.id,
      amount: this.parseAmount(payment.amount),
      currency: payment.currency,
      status: this.mapPaymentStatus(payment.result.code),
      description: payment.descriptor,
      metadata: payment.customParameters,
      customer: {
        id: payment.customer?.merchantCustomerId || '',
        email: payment.customer?.email || '',
        phone: payment.customer?.phone || '',
        name: `${payment.customer?.givenName || ''} ${payment.customer?.surname || ''}`.trim()
      },
      createdAt: new Date(payment.timestamp)
    }
  }

  private mapHyperPayToTransaction(payment: HyperPayPayment): PaymentTransaction {
    return {
      id: payment.id,
      paymentIntentId: payment.merchantTransactionId,
      amount: this.parseAmount(payment.amount),
      currency: payment.currency,
      status: this.mapPaymentStatus(payment.result.code),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      cardDetails: payment.card ? {
        brand: this.mapPaymentBrand(payment.paymentBrand),
        last4: payment.card.last4Digits,
        authCode: payment.resultDetails?.clearingInstituteName
      } : undefined,
      customer: {
        id: payment.customer?.merchantCustomerId || '',
        email: payment.customer?.email || '',
        phone: payment.customer?.phone || '',
        name: `${payment.customer?.givenName || ''} ${payment.customer?.surname || ''}`.trim()
      },
      orderId: payment.customParameters?.orderId || '',
      supplierId: payment.customParameters?.supplierId,
      metadata: payment.customParameters,
      createdAt: new Date(payment.timestamp),
      updatedAt: new Date(payment.timestamp),
      pspTransactionId: payment.id,
      pspResponse: payment
    }
  }

  private mapPaymentStatus(code: string): PaymentStatus {
    if (this.isSuccessCode(code)) {
      if (code.startsWith('000.100')) return PaymentStatus.AUTHORIZED
      if (code.startsWith('000.000')) return PaymentStatus.CAPTURED
      if (code.startsWith('000.400')) return PaymentStatus.REFUNDED
    }

    return PaymentStatus.FAILED
  }

  private mapWebhookType(hyperPayType: string): PaymentWebhookEventType {
    const typeMap: Record<string, PaymentWebhookEventType> = {
      'PA.SUCCESSFUL': PaymentWebhookEventType.PAYMENT_AUTHORIZED,
      'DB.SUCCESSFUL': PaymentWebhookEventType.PAYMENT_CAPTURED,
      'CP.SUCCESSFUL': PaymentWebhookEventType.PAYMENT_CAPTURED,
      'RF.SUCCESSFUL': PaymentWebhookEventType.PAYMENT_REFUNDED,
      'RV.SUCCESSFUL': PaymentWebhookEventType.PAYMENT_REFUNDED,
      'PA.FAILED': PaymentWebhookEventType.PAYMENT_FAILED,
      'DB.FAILED': PaymentWebhookEventType.PAYMENT_FAILED
    }

    return typeMap[hyperPayType] || PaymentWebhookEventType.PAYMENT_FAILED
  }

  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
  }
}