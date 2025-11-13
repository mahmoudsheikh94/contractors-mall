/**
 * HyperPay Webhook Handler
 * ========================
 * Processes webhook events from HyperPay payment gateway
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment/service'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Webhook payload validation
const HyperPayWebhookSchema = z.object({
  id: z.string(),
  paymentType: z.string(),
  paymentBrand: z.string(),
  amount: z.string(),
  currency: z.string(),
  descriptor: z.string().optional(),
  merchantTransactionId: z.string().optional(),
  result: z.object({
    code: z.string(),
    description: z.string()
  }),
  resultDetails: z.object({
    ExtendedDescription: z.string().optional(),
    clearingInstituteName: z.string().optional()
  }).optional(),
  card: z.object({
    bin: z.string(),
    last4Digits: z.string(),
    holder: z.string().optional(),
    expiryMonth: z.string(),
    expiryYear: z.string()
  }).optional(),
  customer: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional()
  }).optional(),
  customParameters: z.record(z.string()).optional(),
  timestamp: z.string(),
  ndc: z.string()
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let webhookId: string | null = null

  try {
    // Get signature from headers
    const signature = request.headers.get('X-HyperPay-Signature')
    if (!signature) {
      console.error('Missing webhook signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Parse request body
    const rawBody = await request.text()
    let payload: any

    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('Invalid webhook payload format')
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }

    // Log webhook receipt
    const supabase = await createClient()
    const { data: webhook, error: logError } = await supabase
      .from('payment_webhooks')
      .insert({
        provider: 'hyperpay',
        event_id: payload.id,
        event_type: `${payload.paymentType}.${payload.result?.code}`,
        payload,
        headers: Object.fromEntries(request.headers.entries()),
        signature,
        status: 'processing'
      })
      .select('id')
      .single()

    if (webhook) {
      webhookId = webhook.id
    }

    // Validate webhook signature
    const isValid = await paymentService.getProvider().validateWebhookSignature({
      payload,
      signature
    })

    if (!isValid) {
      console.error('Invalid webhook signature')

      if (webhookId) {
        await supabase
          .from('payment_webhooks')
          .update({
            status: 'failed',
            error_message: 'Invalid signature',
            processed_at: new Date().toISOString()
          })
          .eq('id', webhookId)
      }

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Validate payload schema
    const validatedData = HyperPayWebhookSchema.safeParse(payload)
    if (!validatedData.success) {
      console.error('Invalid webhook payload:', validatedData.error)

      if (webhookId) {
        await supabase
          .from('payment_webhooks')
          .update({
            status: 'failed',
            error_message: 'Invalid payload schema',
            processed_at: new Date().toISOString()
          })
          .eq('id', webhookId)
      }

      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // Process the webhook
    const result = await paymentService.handleWebhook(payload, signature)

    // Update webhook log
    if (webhookId) {
      await supabase
        .from('payment_webhooks')
        .update({
          status: result.success ? 'processed' : 'failed',
          error_message: result.success ? null : result.message,
          processed_at: new Date().toISOString(),
          transaction_id: payload.customParameters?.transactionId
        })
        .eq('id', webhookId)
    }

    // Handle specific webhook events
    const eventType = `${payload.paymentType}.${payload.result?.code}`

    switch (eventType) {
      case 'PA.000.000.000': // Pre-authorization success
      case 'PA.000.100.110': // Pre-authorization success
        await handleAuthorizationSuccess(payload)
        break

      case 'DB.000.000.000': // Debit/Capture success
      case 'DB.000.100.110': // Debit/Capture success
        await handleCaptureSuccess(payload)
        break

      case 'CP.000.000.000': // Capture success
      case 'CP.000.100.110': // Capture success
        await handleCaptureSuccess(payload)
        break

      case 'RF.000.000.000': // Refund success
      case 'RF.000.100.110': // Refund success
        await handleRefundSuccess(payload)
        break

      case 'RV.000.000.000': // Reversal success
        await handleReversalSuccess(payload)
        break

      default:
        if (!isSuccessCode(payload.result?.code)) {
          await handlePaymentFailure(payload)
        }
    }

    const processingTime = Date.now() - startTime
    console.log(`HyperPay webhook processed in ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      processingTime
    })

  } catch (error: any) {
    console.error('Webhook processing error:', error)

    // Log error
    if (webhookId) {
      const supabase = await createClient()
      await supabase
        .from('payment_webhooks')
        .update({
          status: 'failed',
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookId)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to check if code is success
function isSuccessCode(code: string): boolean {
  const successPatterns = [
    /^(000\.000\.|000\.100\.1|000\.[36])/,
    /^(000\.200)/,
    /^(000\.400\.0[^3]|000\.400\.100)/,
    /^(800\.400\.5|800\.400\.500)/
  ]
  return successPatterns.some(pattern => pattern.test(code))
}

// Event handlers
async function handleAuthorizationSuccess(payload: any) {
  const supabase = await createClient()
  const transactionId = payload.id
  const orderId = payload.customParameters?.orderId

  if (!orderId) return

  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'authorized',
      payment_transaction_id: transactionId,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  // TODO: Send confirmation email to customer
  console.log('Payment authorized for order:', orderId)
}

async function handleCaptureSuccess(payload: any) {
  const supabase = await createClient()
  const transactionId = payload.id
  const orderId = payload.customParameters?.orderId

  if (!orderId) return

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*, supplier:suppliers(*)')
    .eq('id', orderId)
    .single()

  if (!order) return

  // Calculate escrow release date (3 days from now)
  const escrowDays = 3
  const escrowReleaseDate = new Date()
  escrowReleaseDate.setDate(escrowReleaseDate.getDate() + escrowDays)

  // Update transaction with escrow details
  await supabase
    .from('payment_transactions')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString(),
      escrow_release_date: escrowReleaseDate.toISOString(),
      commission_rate: 10, // 10% platform fee
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId)

  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'captured',
      paid_at: new Date().toISOString(),
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  // TODO: Send payment confirmation to customer and supplier
  console.log('Payment captured for order:', orderId)
}

async function handleRefundSuccess(payload: any) {
  const supabase = await createClient()
  const refundId = payload.id
  const originalTransactionId = payload.customParameters?.originalTransactionId
  const refundAmount = parseFloat(payload.amount) * 1000 // Convert to fils

  if (!originalTransactionId) return

  // Update refund request
  await supabase
    .from('refund_requests')
    .update({
      status: 'completed',
      psp_refund_id: refundId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('transaction_id', originalTransactionId)
    .eq('status', 'processing')

  // Update original transaction
  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('amount, refunded_amount')
    .eq('id', originalTransactionId)
    .single()

  if (transaction) {
    const totalRefunded = (transaction.refunded_amount || 0) + refundAmount
    const isFullRefund = totalRefunded >= transaction.amount

    await supabase
      .from('payment_transactions')
      .update({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        refunded_amount: totalRefunded,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', originalTransactionId)
  }

  // TODO: Send refund confirmation to customer
  console.log('Refund processed:', refundId)
}

async function handleReversalSuccess(payload: any) {
  // Handle payment reversal (similar to refund)
  await handleRefundSuccess(payload)
}

async function handlePaymentFailure(payload: any) {
  const supabase = await createClient()
  const transactionId = payload.id
  const orderId = payload.customParameters?.orderId

  if (!orderId) return

  // Update transaction status
  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      psp_response: payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId)

  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      status: 'cancelled',
      cancelled_reason: `Payment failed: ${payload.result?.description}`,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  // TODO: Send failure notification to customer
  console.log('Payment failed for order:', orderId)
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  // HyperPay webhook verification
  const challenge = request.nextUrl.searchParams.get('challenge')

  if (challenge) {
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({
    status: 'ok',
    provider: 'hyperpay',
    timestamp: new Date().toISOString()
  })
}