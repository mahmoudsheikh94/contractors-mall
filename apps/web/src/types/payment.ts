// Payment types

export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded' | 'failed'

export interface Payment {
  id: string
  order_id: string
  payment_intent_id: string | null
  payment_method: string | null
  status: PaymentStatus
  amount_jod: number
  held_at: string | null
  released_at: string | null
  refunded_at: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled'
  client_secret?: string
  metadata: Record<string, any>
}

export interface PaymentProvider {
  /**
   * Create a payment intent to hold funds in escrow
   */
  createPaymentIntent(params: {
    amount: number
    currency: string
    metadata: Record<string, any>
  }): Promise<PaymentIntent>

  /**
   * Hold (capture) the payment - money is now in escrow
   */
  holdPayment(paymentIntentId: string): Promise<void>

  /**
   * Release payment to supplier
   */
  releasePayment(paymentIntentId: string, recipientId: string): Promise<void>

  /**
   * Refund payment to contractor
   */
  refundPayment(paymentIntentId: string, amount?: number): Promise<void>
}
