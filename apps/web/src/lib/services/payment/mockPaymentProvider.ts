import type { PaymentProvider, PaymentIntent } from '@/types/payment'

/**
 * Mock Payment Provider for testing
 * Simulates PSP behavior without actual payment processing
 */
export class MockPaymentProvider implements PaymentProvider {
  private intents: Map<string, PaymentIntent> = new Map()

  async createPaymentIntent(params: {
    amount: number
    currency: string
    metadata: Record<string, any>
  }): Promise<PaymentIntent> {
    // Simulate API delay
    await this.simulateDelay(500)

    const intent: PaymentIntent = {
      id: `pi_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_confirmation',
      client_secret: `pi_mock_secret_${Math.random().toString(36).substring(7)}`,
      metadata: params.metadata,
    }

    this.intents.set(intent.id, intent)
    console.log('[MockPaymentProvider] Created payment intent:', intent.id)

    return intent
  }

  async holdPayment(paymentIntentId: string): Promise<void> {
    await this.simulateDelay(300)

    const intent = this.intents.get(paymentIntentId)
    if (!intent) {
      throw new Error(`Payment intent not found: ${paymentIntentId}`)
    }

    intent.status = 'succeeded'
    this.intents.set(paymentIntentId, intent)

    console.log('[MockPaymentProvider] Payment held (captured):', paymentIntentId)
  }

  async releasePayment(paymentIntentId: string, recipientId: string): Promise<void> {
    await this.simulateDelay(300)

    const intent = this.intents.get(paymentIntentId)
    if (!intent) {
      throw new Error(`Payment intent not found: ${paymentIntentId}`)
    }

    if (intent.status !== 'succeeded') {
      throw new Error(`Payment cannot be released. Current status: ${intent.status}`)
    }

    console.log('[MockPaymentProvider] Payment released to:', recipientId, 'Amount:', intent.amount)
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<void> {
    await this.simulateDelay(300)

    const intent = this.intents.get(paymentIntentId)
    if (!intent) {
      throw new Error(`Payment intent not found: ${paymentIntentId}`)
    }

    const refundAmount = amount || intent.amount

    if (refundAmount > intent.amount) {
      throw new Error(`Refund amount exceeds payment amount`)
    }

    console.log('[MockPaymentProvider] Refund processed:', refundAmount, 'JOD')
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const mockPaymentProvider = new MockPaymentProvider()
