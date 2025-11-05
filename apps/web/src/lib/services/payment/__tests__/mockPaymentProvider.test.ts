/**
 * Unit tests for MockPaymentProvider
 */

import { MockPaymentProvider } from '../mockPaymentProvider'

// Mock console.log to avoid cluttering test output
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

describe('MockPaymentProvider', () => {
  let provider: MockPaymentProvider

  beforeEach(() => {
    provider = new MockPaymentProvider()
    consoleLogSpy.mockClear()
    jest.clearAllTimers()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
  })

  describe('createPaymentIntent', () => {
    it('should create a payment intent', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: { orderId: 'order-123' },
      })

      expect(intent).toHaveProperty('id')
      expect(intent).toHaveProperty('amount')
      expect(intent).toHaveProperty('currency')
      expect(intent).toHaveProperty('status')
      expect(intent).toHaveProperty('client_secret')
      expect(intent).toHaveProperty('metadata')
    })

    it('should set correct amount and currency', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 150.5,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent.amount).toBe(150.5)
      expect(intent.currency).toBe('JOD')
    })

    it('should set initial status to requires_confirmation', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent.status).toBe('requires_confirmation')
    })

    it('should store metadata', async () => {
      const metadata = {
        orderId: 'order-123',
        customerId: 'cust-456',
        note: 'Test payment',
      }

      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata,
      })

      expect(intent.metadata).toEqual(metadata)
    })

    it('should generate unique payment intent IDs', async () => {
      const intent1 = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      const intent2 = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent1.id).not.toBe(intent2.id)
    })

    it('should generate unique client secrets', async () => {
      const intent1 = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      const intent2 = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent1.client_secret).not.toBe(intent2.client_secret)
    })

    it('should log payment intent creation', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MockPaymentProvider] Created payment intent:',
        intent.id
      )
    })

    it('should handle large amounts', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 9999999.99,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent.amount).toBe(9999999.99)
    })

    it('should handle empty metadata', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent.metadata).toEqual({})
    })
  })

  describe('holdPayment', () => {
    let intentId: string

    beforeEach(async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })
      intentId = intent.id
    })

    it('should hold a payment successfully', async () => {
      await expect(provider.holdPayment(intentId)).resolves.not.toThrow()
    })

    it('should update payment status to succeeded', async () => {
      await provider.holdPayment(intentId)

      // Create another provider to access the same intent
      // (since intents Map is private, we'll test by trying to release)
      await expect(provider.releasePayment(intentId, 'supplier-123')).resolves.not.toThrow()
    })

    it('should throw error for non-existent payment intent', async () => {
      await expect(provider.holdPayment('non-existent-id')).rejects.toThrow(
        'Payment intent not found'
      )
    })

    it('should log payment hold', async () => {
      consoleLogSpy.mockClear()

      await provider.holdPayment(intentId)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MockPaymentProvider] Payment held (captured):',
        intentId
      )
    })

    it('should allow holding multiple different payments', async () => {
      const intent2 = await provider.createPaymentIntent({
        amount: 200,
        currency: 'JOD',
        metadata: {},
      })

      await expect(provider.holdPayment(intentId)).resolves.not.toThrow()
      await expect(provider.holdPayment(intent2.id)).resolves.not.toThrow()
    })
  })

  describe('releasePayment', () => {
    let intentId: string

    beforeEach(async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: { orderId: 'order-123' },
      })
      intentId = intent.id
      await provider.holdPayment(intentId)
    })

    it('should release payment successfully', async () => {
      await expect(provider.releasePayment(intentId, 'supplier-123')).resolves.not.toThrow()
    })

    it('should throw error for non-existent payment intent', async () => {
      await expect(provider.releasePayment('non-existent-id', 'supplier-123')).rejects.toThrow(
        'Payment intent not found'
      )
    })

    it('should throw error if payment not held yet', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      await expect(provider.releasePayment(intent.id, 'supplier-123')).rejects.toThrow(
        'Payment cannot be released'
      )
    })

    it('should log payment release with recipient and amount', async () => {
      consoleLogSpy.mockClear()

      await provider.releasePayment(intentId, 'supplier-456')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MockPaymentProvider] Payment released to:',
        'supplier-456',
        'Amount:',
        100
      )
    })

    it('should release to different recipients', async () => {
      await expect(provider.releasePayment(intentId, 'supplier-001')).resolves.not.toThrow()

      const intent2 = await provider.createPaymentIntent({
        amount: 200,
        currency: 'JOD',
        metadata: {},
      })
      await provider.holdPayment(intent2.id)

      await expect(provider.releasePayment(intent2.id, 'supplier-002')).resolves.not.toThrow()
    })
  })

  describe('refundPayment', () => {
    let intentId: string

    beforeEach(async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })
      intentId = intent.id
    })

    it('should refund full amount by default', async () => {
      await expect(provider.refundPayment(intentId)).resolves.not.toThrow()
    })

    it('should refund partial amount', async () => {
      await expect(provider.refundPayment(intentId, 50)).resolves.not.toThrow()
    })

    it('should throw error for non-existent payment intent', async () => {
      await expect(provider.refundPayment('non-existent-id')).rejects.toThrow(
        'Payment intent not found'
      )
    })

    it('should throw error if refund exceeds payment amount', async () => {
      await expect(provider.refundPayment(intentId, 150)).rejects.toThrow(
        'Refund amount exceeds payment amount'
      )
    })

    it('should log full refund', async () => {
      consoleLogSpy.mockClear()

      await provider.refundPayment(intentId)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MockPaymentProvider] Refund processed:',
        100,
        'JOD'
      )
    })

    it('should log partial refund', async () => {
      consoleLogSpy.mockClear()

      await provider.refundPayment(intentId, 30)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MockPaymentProvider] Refund processed:',
        30,
        'JOD'
      )
    })

    it('should refund exactly the payment amount', async () => {
      await expect(provider.refundPayment(intentId, 100)).resolves.not.toThrow()
    })

    it('should handle decimal refund amounts', async () => {
      await expect(provider.refundPayment(intentId, 45.99)).resolves.not.toThrow()
    })
  })

  describe('Payment Flow', () => {
    it('should complete full escrow flow: create → hold → release', async () => {
      // 1. Create payment intent
      const intent = await provider.createPaymentIntent({
        amount: 250,
        currency: 'JOD',
        metadata: { orderId: 'order-789' },
      })

      expect(intent.status).toBe('requires_confirmation')

      // 2. Hold payment
      await provider.holdPayment(intent.id)

      // 3. Release payment
      await expect(provider.releasePayment(intent.id, 'supplier-789')).resolves.not.toThrow()
    })

    it('should complete refund flow: create → hold → refund', async () => {
      // 1. Create payment intent
      const intent = await provider.createPaymentIntent({
        amount: 150,
        currency: 'JOD',
        metadata: {},
      })

      // 2. Hold payment
      await provider.holdPayment(intent.id)

      // 3. Refund payment
      await expect(provider.refundPayment(intent.id, 75)).resolves.not.toThrow()
    })

    it('should handle multiple concurrent payments', async () => {
      const intent1 = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: { order: '1' },
      })

      const intent2 = await provider.createPaymentIntent({
        amount: 200,
        currency: 'JOD',
        metadata: { order: '2' },
      })

      const intent3 = await provider.createPaymentIntent({
        amount: 300,
        currency: 'JOD',
        metadata: { order: '3' },
      })

      await provider.holdPayment(intent1.id)
      await provider.holdPayment(intent2.id)
      await provider.holdPayment(intent3.id)

      await expect(provider.releasePayment(intent1.id, 'supp-1')).resolves.not.toThrow()
      await expect(provider.releasePayment(intent2.id, 'supp-2')).resolves.not.toThrow()
      await expect(provider.refundPayment(intent3.id)).resolves.not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero amount payment', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 0,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent.amount).toBe(0)
    })

    it('should handle very small amounts', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 0.01,
        currency: 'JOD',
        metadata: {},
      })

      expect(intent.amount).toBe(0.01)
    })

    it('should handle metadata with special characters', async () => {
      const metadata = {
        note: 'Payment for "أسمنت مقاوم" & delivery',
        special: '<test>',
      }

      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata,
      })

      expect(intent.metadata).toEqual(metadata)
    })

    it('should handle empty recipient ID', async () => {
      const intent = await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })
      await provider.holdPayment(intent.id)

      await expect(provider.releasePayment(intent.id, '')).resolves.not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should simulate realistic API delays', async () => {
      const start = Date.now()

      await provider.createPaymentIntent({
        amount: 100,
        currency: 'JOD',
        metadata: {},
      })

      const duration = Date.now() - start

      // Should take at least 500ms (simulated delay)
      expect(duration).toBeGreaterThanOrEqual(450) // Allow small margin
    })
  })
})
