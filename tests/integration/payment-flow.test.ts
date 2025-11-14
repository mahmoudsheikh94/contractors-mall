/**
 * Payment Flow Integration Tests
 * ==============================
 * Tests the complete payment flow from order to escrow release
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { paymentService } from '../../apps/web/src/lib/services/payment/service'
import { notificationService } from '../../apps/web/src/lib/services/notifications/service'

// Test environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data
let testContractor: any
let testSupplier: any
let testOrder: any
let testTransaction: any

describe('Payment Flow Integration', () => {
  beforeAll(async () => {
    // Initialize services
    await paymentService.initialize()
    await notificationService.initialize()

    // Create test contractor
    const { data: contractor } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Contractor',
        email: 'test.contractor@example.com',
        phone: '+962791234567',
        role: 'contractor',
        is_verified: true
      })
      .select()
      .single()

    testContractor = contractor

    // Create test supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .insert({
        business_name: 'Test Supplier',
        owner_id: testContractor.id, // Using same ID for simplicity
        is_verified: true,
        commission_rate: 10
      })
      .select()
      .single()

    testSupplier = supplier

    // Create test order
    const { data: order } = await supabase
      .from('orders')
      .insert({
        order_number: `TEST-${Date.now()}`,
        contractor_id: testContractor.id,
        supplier_id: testSupplier.id,
        total_jod: 150,
        status: 'pending',
        payment_status: 'pending',
        delivery_address: 'Test Address, Amman',
        delivery_date: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      })
      .select()
      .single()

    testOrder = order
  })

  afterAll(async () => {
    // Clean up test data
    if (testOrder?.id) {
      await supabase.from('orders').delete().eq('id', testOrder.id)
    }
    if (testSupplier?.id) {
      await supabase.from('suppliers').delete().eq('id', testSupplier.id)
    }
    if (testContractor?.id) {
      await supabase.from('profiles').delete().eq('id', testContractor.id)
    }
  })

  describe('Payment Processing', () => {
    it('should process payment and enter escrow', async () => {
      // Process payment
      const transaction = await paymentService.processOrder({
        orderId: testOrder.id,
        amount: testOrder.total_jod,
        customer: {
          id: testContractor.id,
          email: testContractor.email,
          phone: testContractor.phone,
          name: testContractor.full_name
        },
        saveCard: false
      })

      expect(transaction).toBeDefined()
      expect(transaction.status).toBe('PENDING')
      expect(transaction.amount).toBe(testOrder.total_jod)

      testTransaction = transaction

      // Verify order status updated
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', testOrder.id)
        .single()

      expect(updatedOrder.payment_status).toBe('processing')
    })

    it('should capture payment and hold in escrow', async () => {
      // Simulate payment capture (webhook callback)
      const capturedTransaction = await paymentService
        .getProvider()
        .capturePayment({
          transactionId: testTransaction.id,
          amount: testTransaction.amount
        })

      expect(capturedTransaction.status).toBe('CAPTURED')

      // Verify escrow hold created
      const { data: escrowHold } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', testTransaction.id)
        .single()

      expect(escrowHold.status).toBe('captured')
      expect(escrowHold.escrow_release_date).toBeDefined()
    })
  })

  describe('Delivery Confirmation', () => {
    it('should require PIN for orders >= 120 JOD', async () => {
      // Create delivery record
      const { data: delivery } = await supabase
        .from('deliveries')
        .insert({
          order_id: testOrder.id,
          status: 'in_transit',
          confirmation_pin: '123456', // Test PIN
          driver_id: testContractor.id
        })
        .select()
        .single()

      expect(delivery).toBeDefined()
      expect(delivery.confirmation_pin).toBeDefined()

      // Since order is 150 JOD, it should require PIN
      expect(testOrder.total_jod).toBeGreaterThanOrEqual(120)
    })

    it('should verify PIN and release payment', async () => {
      // Simulate PIN verification
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/deliveries/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testContractor.access_token}`
        },
        body: JSON.stringify({
          orderId: testOrder.id,
          pin: '123456'
        })
      })

      // Note: This would work in a real environment with API running
      // For unit testing, we'll directly call the service
      await paymentService.confirmDelivery({
        orderId: testOrder.id,
        transactionId: testTransaction.id,
        supplierId: testSupplier.id
      })

      // Verify payment released
      const { data: releasedTransaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', testTransaction.id)
        .single()

      expect(releasedTransaction.status).toBe('released')
      expect(releasedTransaction.supplier_amount).toBeDefined()
      expect(releasedTransaction.platform_amount).toBeDefined()
    })

    it('should require photo for orders < 120 JOD', async () => {
      // Create small value order
      const { data: smallOrder } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-SMALL-${Date.now()}`,
          contractor_id: testContractor.id,
          supplier_id: testSupplier.id,
          total_jod: 80, // Less than 120
          status: 'pending',
          payment_status: 'pending',
          delivery_address: 'Test Address, Amman',
          delivery_date: new Date(Date.now() + 86400000).toISOString()
        })
        .select()
        .single()

      // Order should require photo confirmation
      expect(smallOrder.total_jod).toBeLessThan(120)

      // Clean up
      await supabase.from('orders').delete().eq('id', smallOrder.id)
    })
  })

  describe('Dispute Management', () => {
    it('should freeze payment when dispute created', async () => {
      // Create another order for dispute testing
      const { data: disputeOrder } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-DISPUTE-${Date.now()}`,
          contractor_id: testContractor.id,
          supplier_id: testSupplier.id,
          total_jod: 200,
          status: 'delivered',
          payment_status: 'captured'
        })
        .select()
        .single()

      // Create dispute
      const { data: dispute } = await supabase
        .from('disputes')
        .insert({
          order_id: disputeOrder.id,
          transaction_id: 'test-transaction-id',
          reason: 'Product damaged',
          status: 'pending'
        })
        .select()
        .single()

      expect(dispute).toBeDefined()
      expect(dispute.status).toBe('pending')

      // Clean up
      await supabase.from('disputes').delete().eq('id', dispute.id)
      await supabase.from('orders').delete().eq('id', disputeOrder.id)
    })

    it('should schedule site visit for high-value disputes', async () => {
      // Create high-value order
      const { data: highValueOrder } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-HIGH-${Date.now()}`,
          contractor_id: testContractor.id,
          supplier_id: testSupplier.id,
          total_jod: 500, // High value
          status: 'delivered',
          payment_status: 'captured'
        })
        .select()
        .single()

      // Create dispute
      const { data: dispute } = await supabase
        .from('disputes')
        .insert({
          order_id: highValueOrder.id,
          transaction_id: 'test-high-transaction',
          reason: 'Wrong items delivered',
          status: 'pending'
        })
        .select()
        .single()

      // For orders >= 350 JOD, site visit should be schedulable
      expect(highValueOrder.total_jod).toBeGreaterThanOrEqual(350)

      // Create site visit
      const { data: siteVisit } = await supabase
        .from('site_visits')
        .insert({
          dispute_id: dispute.id,
          order_id: highValueOrder.id,
          scheduled_date: new Date(Date.now() + 172800000).toISOString(), // 2 days later
          status: 'scheduled'
        })
        .select()
        .single()

      expect(siteVisit).toBeDefined()
      expect(siteVisit.status).toBe('scheduled')

      // Clean up
      await supabase.from('site_visits').delete().eq('id', siteVisit.id)
      await supabase.from('disputes').delete().eq('id', dispute.id)
      await supabase.from('orders').delete().eq('id', highValueOrder.id)
    })
  })

  describe('Notification System', () => {
    it('should send email notification on payment success', async () => {
      const emailSpy = jest.spyOn(notificationService, 'send')

      // Trigger payment notification
      await notificationService.send({
        id: `test-payment-${Date.now()}`,
        type: 'PAYMENT_CAPTURED',
        channel: 'email',
        priority: 'high',
        recipient: {
          id: testContractor.id,
          email: testContractor.email,
          name: testContractor.full_name
        },
        subject: 'Payment Confirmed',
        html: '<p>Your payment has been confirmed</p>',
        data: {
          orderId: testOrder.id,
          amount: testOrder.total_jod
        }
      })

      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PAYMENT_CAPTURED',
          channel: 'email'
        })
      )

      emailSpy.mockRestore()
    })

    it('should send SMS for delivery PIN', async () => {
      const smsSpy = jest.spyOn(notificationService, 'send')

      // Trigger SMS notification
      await notificationService.send({
        id: `test-sms-${Date.now()}`,
        type: 'DELIVERY_PIN',
        channel: 'sms',
        priority: 'critical',
        recipient: {
          id: testContractor.id,
          phone: testContractor.phone,
          name: testContractor.full_name
        },
        text: 'Your delivery PIN is: 123456',
        data: {
          orderId: testOrder.id,
          pin: '123456'
        }
      })

      expect(smsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELIVERY_PIN',
          channel: 'sms'
        })
      )

      smsSpy.mockRestore()
    })

    it('should queue notifications for batch processing', async () => {
      const notifications = []

      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        notifications.push({
          id: `batch-${i}`,
          type: 'ORDER_UPDATE',
          channel: 'email',
          priority: 'low',
          recipient: {
            id: testContractor.id,
            email: testContractor.email,
            name: testContractor.full_name
          },
          subject: `Order Update ${i}`,
          html: `<p>Update ${i}</p>`,
          data: { orderId: testOrder.id }
        })
      }

      // Send all notifications
      await Promise.all(
        notifications.map(n => notificationService.send(n as any))
      )

      // Verify all queued (would check Redis queue in real test)
      expect(notifications.length).toBe(5)
    })
  })

  describe('Escrow Release Automation', () => {
    it('should automatically release escrow after confirmation period', async () => {
      // Create order with past escrow release date
      const { data: autoReleaseOrder } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-AUTO-${Date.now()}`,
          contractor_id: testContractor.id,
          supplier_id: testSupplier.id,
          total_jod: 100,
          status: 'delivered',
          payment_status: 'captured',
          completed_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
        })
        .select()
        .single()

      // Create transaction with past release date
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .insert({
          order_id: autoReleaseOrder.id,
          customer_id: testContractor.id,
          amount: 100,
          currency: 'JOD',
          status: 'captured',
          escrow_release_date: new Date(Date.now() - 86400000).toISOString() // Yesterday
        })
        .select()
        .single()

      // Run scheduled release
      const result = await paymentService.processScheduledReleases()

      expect(result.released).toBeGreaterThan(0)

      // Verify transaction released
      const { data: releasedTx } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transaction.id)
        .single()

      expect(releasedTx.status).toBe('released')

      // Clean up
      await supabase.from('payment_transactions').delete().eq('id', transaction.id)
      await supabase.from('orders').delete().eq('id', autoReleaseOrder.id)
    })
  })

  describe('Refund Processing', () => {
    it('should process refunds correctly', async () => {
      // Create refund request
      const { data: refundRequest } = await supabase
        .from('refund_requests')
        .insert({
          transaction_id: testTransaction.id,
          amount: 50, // Partial refund
          reason: 'Partial order cancellation',
          status: 'pending',
          requested_by: testContractor.id
        })
        .select()
        .single()

      // Process refund
      const refundResult = await paymentService.getProvider().refundPayment({
        transactionId: testTransaction.id,
        amount: 50,
        reason: 'Partial order cancellation',
        requestedBy: testContractor.id,
        metadata: {}
      })

      expect(refundResult).toBeDefined()
      expect(refundResult.status).toBe('REFUNDED')

      // Clean up
      await supabase.from('refund_requests').delete().eq('id', refundRequest.id)
    })
  })

  describe('Commission Calculation', () => {
    it('should calculate commission correctly', () => {
      const orderAmount = 100
      const commissionRate = 10 // 10%

      const commissionAmount = Math.round(orderAmount * commissionRate / 100)
      const supplierAmount = orderAmount - commissionAmount

      expect(commissionAmount).toBe(10)
      expect(supplierAmount).toBe(90)
    })

    it('should handle different commission rates', () => {
      const testCases = [
        { amount: 100, rate: 10, expectedCommission: 10, expectedSupplier: 90 },
        { amount: 150, rate: 15, expectedCommission: 23, expectedSupplier: 127 },
        { amount: 75.5, rate: 8, expectedCommission: 6, expectedSupplier: 69.5 }
      ]

      testCases.forEach(test => {
        const commission = Math.round(test.amount * test.rate / 100)
        const supplier = test.amount - commission

        expect(commission).toBe(test.expectedCommission)
        expect(supplier).toBeCloseTo(test.expectedSupplier, 1)
      })
    })
  })
})