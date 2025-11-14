/**
 * Payment Service
 * ==============
 * High-level service that manages payment providers and operations
 */

import { IPaymentProvider, IPaymentService } from './interface'
import {
  PaymentTransaction,
  PaymentCustomer,
  PaymentProviderConfig,
  PaymentError,
  PaymentErrorCode,
  PaymentStatus
} from './types'
import { HyperPayProvider } from './providers/hyperpay'
import { MockPaymentProvider } from './mockPaymentProvider'
import { createClient } from '@/lib/supabase/server'

// Singleton instance
let instance: PaymentService | null = null

export class PaymentService implements IPaymentService {
  private provider: IPaymentProvider
  private providers: Map<string, IPaymentProvider> = new Map()

  private constructor() {
    // Initialize with mock provider by default
    this.provider = new MockPaymentProvider() as unknown as IPaymentProvider
    this.providers.set('mock', this.provider)
  }

  static getInstance(): PaymentService {
    if (!instance) {
      instance = new PaymentService()
    }
    return instance
  }

  async initialize() {
    // Load configuration from environment
    const providerType = process.env.PAYMENT_PROVIDER || 'mock'
    const environment = process.env.PAYMENT_ENVIRONMENT as 'sandbox' | 'production' || 'sandbox'

    if (providerType === 'hyperpay') {
      const config: PaymentProviderConfig = {
        provider: 'hyperpay',
        environment,
        entityId: process.env.HYPERPAY_ENTITY_ID,
        apiKey: process.env.HYPERPAY_ACCESS_TOKEN,
        webhookSecret: process.env.HYPERPAY_WEBHOOK_SECRET
      }

      const hyperPay = new HyperPayProvider()
      await hyperPay.initialize(config)

      this.providers.set('hyperpay', hyperPay)
      this.provider = hyperPay
    }

    console.log(`Payment service initialized with ${providerType} provider in ${environment} mode`)
  }

  setProvider(provider: IPaymentProvider): void {
    this.provider = provider
    this.providers.set(provider.name.toLowerCase(), provider)
  }

  getProvider(): IPaymentProvider {
    return this.provider
  }

  async switchProvider(type: string): Promise<void> {
    const provider = this.providers.get(type.toLowerCase())

    if (!provider) {
      throw new PaymentError(
        `Payment provider ${type} not found`,
        PaymentErrorCode.CONFIGURATION_ERROR,
        500
      )
    }

    this.provider = provider
  }

  async processOrder(params: {
    orderId: string
    amount: number
    customer: PaymentCustomer
    saveCard?: boolean
  }): Promise<PaymentTransaction> {
    const supabase = (await createClient()) as any

    try {
      // Create payment intent
      const intent = await this.provider.createPaymentIntent({
        amount: params.amount,
        currency: 'JOD',
        customer: params.customer,
        description: `Order ${params.orderId}`,
        metadata: {
          orderId: params.orderId,
          customerId: params.customer.id
        }
      })

      // Store payment intent in database
      const { error: dbError } = await (supabase as any)
        .from('payment_transactions')
        .insert({
          id: intent.id,
          order_id: params.orderId,
          customer_id: params.customer.id,
          amount: params.amount,
          currency: 'JOD',
          status: 'pending',
          provider: this.provider.name,
          metadata: intent.metadata
        })

      if (dbError) {
        throw new PaymentError(
          'Failed to store payment intent',
          PaymentErrorCode.PROVIDER_ERROR,
          500,
          dbError
        )
      }

      // Return a transaction object for now
      // Actual authorization happens on the frontend with card details
      return {
        id: intent.id,
        paymentIntentId: intent.id,
        amount: params.amount,
        currency: 'JOD',
        status: PaymentStatus.PENDING,
        paymentMethod: null as any, // Will be set after authorization
        customer: params.customer,
        orderId: params.orderId,
        metadata: intent.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        pspTransactionId: intent.id,
        pspResponse: intent
      }
    } catch (error: any) {
      console.error('Payment processing failed:', error)

      // Update order status to payment_failed
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_reason: 'Payment failed'
        })
        .eq('id', params.orderId)

      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Payment processing failed',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async confirmDelivery(params: {
    orderId: string
    transactionId: string
    supplierId: string
  }): Promise<void> {
    const supabase = (await createClient()) as any

    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, supplier:suppliers(*)')
        .eq('id', params.orderId)
        .single()

      if (orderError || !order) {
        throw new PaymentError(
          'Order not found',
          PaymentErrorCode.PROVIDER_ERROR,
          404
        )
      }

      // Calculate commission
      const commissionRate = 10 // 10% platform commission
      const commissionAmount = Math.round((order as any).total_amount * commissionRate / 100)
      const supplierAmount = (order as any).total_amount - commissionAmount

      // Release payment from escrow
      const result = await this.provider.releaseFromEscrow({
        transactionId: params.transactionId,
        supplierId: params.supplierId,
        commission: commissionRate
      })

      // Update transaction status
      const { error: txError } = await (supabase as any)
        .from('payment_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          supplier_amount: result.supplierAmount,
          platform_amount: result.platformAmount
        })
        .eq('id', params.transactionId)

      if (txError) {
        throw new PaymentError(
          'Failed to update transaction',
          PaymentErrorCode.PROVIDER_ERROR,
          500,
          txError
        )
      }

      // Update supplier wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          available_balance: supabase.raw('available_balance + ?', [supplierAmount]),
          total_earned: supabase.raw('total_earned + ?', [supplierAmount])
        })
        .eq('supplier_id', params.supplierId)

      if (walletError) {
        console.error('Failed to update supplier wallet:', walletError)
      }

      // Create wallet transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: order.supplier.wallet_id,
          type: 'credit',
          amount: supplierAmount,
          description: `Payment for order ${order.order_number}`,
          order_id: params.orderId,
          status: 'completed'
        })

      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', params.orderId)

    } catch (error: any) {
      console.error('Failed to confirm delivery:', error)

      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to confirm delivery',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async handleDispute(params: {
    orderId: string
    transactionId: string
    reason: string
    evidence?: any[]
  }): Promise<void> {
    const supabase = (await createClient()) as any

    try {
      // Create dispute record
      const { data: dispute, error: disputeError } = await supabase
        .from('disputes')
        .insert({
          order_id: params.orderId,
          transaction_id: params.transactionId,
          reason: params.reason,
          status: 'pending',
          evidence: params.evidence || []
        })
        .select()
        .single()

      if (disputeError) {
        throw new PaymentError(
          'Failed to create dispute',
          PaymentErrorCode.PROVIDER_ERROR,
          500,
          disputeError
        )
      }

      // Freeze the payment
      const { error: txError } = await (supabase as any)
        .from('payment_transactions')
        .update({
          status: 'disputed',
          disputed_at: new Date().toISOString(),
          dispute_id: dispute.id
        })
        .eq('id', params.transactionId)

      if (txError) {
        throw new PaymentError(
          'Failed to freeze payment',
          PaymentErrorCode.PROVIDER_ERROR,
          500,
          txError
        )
      }

      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'disputed',
          dispute_id: dispute.id
        })
        .eq('id', params.orderId)

      // TODO: Send notifications to admin and supplier

    } catch (error: any) {
      console.error('Failed to handle dispute:', error)

      if (error instanceof PaymentError) throw error

      throw new PaymentError(
        'Failed to handle dispute',
        PaymentErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async processScheduledReleases(): Promise<{
    released: number
    failed: number
    errors: string[]
  }> {
    const supabase = (await createClient()) as any
    const errors: string[] = []
    let released = 0
    let failed = 0

    try {
      // Get all transactions ready for release
      const { data: transactions, error: fetchError } = await (supabase as any)
        .from('payment_transactions')
        .select('*, order:orders!inner(*)')
        .eq('status', 'captured')
        .lte('escrow_release_date', new Date().toISOString())
        .is('dispute_id', null)

      if (fetchError) {
        errors.push(`Failed to fetch transactions: ${fetchError.message}`)
        return { released: 0, failed: 0, errors }
      }

      // Process each transaction
      for (const tx of transactions || []) {
        try {
          await this.confirmDelivery({
            orderId: tx.order_id,
            transactionId: tx.id,
            supplierId: tx.order.supplier_id
          })
          released++
        } catch (error: any) {
          failed++
          errors.push(`Transaction ${tx.id}: ${error.message}`)
        }
      }

      return { released, failed, errors }
    } catch (error: any) {
      errors.push(`General error: ${error.message}`)
      return { released, failed, errors }
    }
  }

  async processScheduledRefunds(): Promise<{
    refunded: number
    failed: number
    errors: string[]
  }> {
    const supabase = (await createClient()) as any
    const errors: string[] = []
    let refunded = 0
    let failed = 0

    try {
      // Get all pending refunds
      const { data: refunds, error: fetchError } = await (supabase as any)
        .from('refund_requests')
        .select('*')
        .eq('status', 'pending')

      if (fetchError) {
        errors.push(`Failed to fetch refunds: ${fetchError.message}`)
        return { refunded: 0, failed: 0, errors }
      }

      // Process each refund
      for (const refund of refunds || []) {
        try {
          const result = await this.provider.refundPayment({
            transactionId: refund.transaction_id,
            amount: refund.amount,
            reason: refund.reason,
            requestedBy: refund.requested_by,
            metadata: refund.metadata
          })

          // Update refund status
          await (supabase as any)
            .from('refund_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              psp_refund_id: result.id
            })
            .eq('id', refund.id)

          // Update transaction
          await (supabase as any)
            .from('payment_transactions')
            .update({
              status: refund.amount === refund.original_amount
                ? 'refunded'
                : 'partially_refunded',
              refunded_amount: refund.amount
            })
            .eq('id', refund.transaction_id)

          refunded++
        } catch (error: any) {
          failed++
          errors.push(`Refund ${refund.id}: ${error.message}`)

          // Mark refund as failed
          await (supabase as any)
            .from('refund_requests')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: error.message
            })
            .eq('id', refund.id)
        }
      }

      return { refunded, failed, errors }
    } catch (error: any) {
      errors.push(`General error: ${error.message}`)
      return { refunded, failed, errors }
    }
  }

  // Webhook handler
  async handleWebhook(
    payload: any,
    signature: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Validate webhook signature
      const isValid = this.provider.validateWebhookSignature({
        payload,
        signature
      })

      if (!isValid) {
        throw new PaymentError(
          'Invalid webhook signature',
          PaymentErrorCode.WEBHOOK_VERIFICATION_FAILED,
          401
        )
      }

      // Parse and handle the event
      const event = await this.provider.parseWebhookEvent(payload)
      const result = await this.provider.handleWebhookEvent(event)

      if (result.transaction) {
        // Update transaction in database
        const supabase = (await createClient()) as any

        await (supabase as any)
          .from('payment_transactions')
          .update({
            status: result.transaction.status,
            psp_response: result.transaction.pspResponse,
            updated_at: new Date().toISOString()
          })
          .eq('id', result.transaction.id)
      }

      return {
        success: true,
        message: `Webhook processed: ${result.action}`
      }
    } catch (error: any) {
      console.error('Webhook processing failed:', error)

      if (error instanceof PaymentError) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: false,
        message: 'Webhook processing failed'
      }
    }
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance()