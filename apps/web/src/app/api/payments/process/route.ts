/**
 * Payment Processing API Route
 * ============================
 * Handles payment processing with escrow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService } from '@/lib/services/payment/service'
import { notificationService } from '@/lib/services/notifications/service'
import { z } from 'zod'

// Request validation schema
const processPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('JOD'),
  customerId: z.string().uuid(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  paymentMethod: z.string(), // Either saved method ID or 'new'
  cardData: z.object({
    number: z.string(),
    holder: z.string(),
    expiryMonth: z.string(),
    expiryYear: z.string(),
    cvv: z.string(),
    saveCard: z.boolean().optional()
  }).optional(),
  saveCard: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const validatedData = processPaymentSchema.parse(body)

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    // Verify user owns the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(id, business_name, owner_id),
        contractor:profiles!contractor_id(full_name, email, phone)
      `)
      .eq('id', validatedData.orderId)
      .eq('contractor_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check order status - allow pending or cancelled (for retry)
    if (order.status !== 'pending' && order.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'لا يمكن معالجة الدفع لهذا الطلب' },
        { status: 400 }
      )
    }

    // Initialize payment service
    await paymentService.initialize()

    // If new card, save it first if requested
    if (validatedData.paymentMethod === 'new' && validatedData.cardData && validatedData.saveCard) {
      // Save card to database
      const { error: saveError } = await (supabase as any)
        .from('payment_methods')
        .insert({
          customer_id: validatedData.customerId,
          type: 'card',
          last4: validatedData.cardData.number.slice(-4),
          brand: detectCardBrand(validatedData.cardData.number),
          holder_name: validatedData.cardData.holder,
          expiry_month: validatedData.cardData.expiryMonth,
          expiry_year: validatedData.cardData.expiryYear,
          is_active: true,
          is_default: false
        })

      if (saveError) {
        console.error('Failed to save payment method:', saveError)
      }
    }

    // Process order payment
    const transaction = await paymentService.processOrder({
      orderId: validatedData.orderId,
      amount: validatedData.amount,
      customer: {
        id: validatedData.customerId,
        email: validatedData.customerEmail,
        phone: validatedData.customerPhone,
        name: order.contractor?.full_name || ''
      },
      saveCard: validatedData.saveCard
    })

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'captured',
        payment_transaction_id: transaction.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.orderId)

    if (updateError) {
      console.error('Failed to update order status:', updateError)
    }

    // Send notifications
    try {
      // Notify contractor
      if (order.contractor?.email) {
        await notificationService.send({
          id: `payment-success-${transaction.id}`,
          type: 'PAYMENT_CAPTURED' as any,
          channel: 'email' as any,
          priority: 'high' as any,
          recipient: {
            id: order.contractor_id,
            email: order.contractor.email,
            name: order.contractor.full_name
          },
          subject: `تم تأكيد الدفع للطلب #${order.order_number}`,
          html: `
            <div dir="rtl">
              <h2>تم استلام دفعتك بنجاح</h2>
              <p>رقم الطلب: #${order.order_number}</p>
              <p>المبلغ: ${validatedData.amount.toFixed(2)} ${validatedData.currency}</p>
              <p>المبلغ محجوز في حساب الضمان وسيتم الإفراج عنه للمورد بعد تأكيد الاستلام.</p>
            </div>
          `,
          data: {
            orderId: validatedData.orderId,
            orderNumber: order.order_number,
            amount: validatedData.amount,
            transactionId: transaction.id
          }
        } as any)
      }

      // Notify supplier
      const { data: supplierOwner } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', order.supplier.owner_id)
        .single()

      if (supplierOwner?.email) {
        await notificationService.send({
          id: `new-order-${validatedData.orderId}`,
          type: 'NEW_ORDER' as any,
          channel: 'email' as any,
          priority: 'high' as any,
          recipient: {
            id: order.supplier.owner_id,
            email: supplierOwner.email,
            name: supplierOwner.full_name
          },
          subject: `طلب جديد #${order.order_number}`,
          html: `
            <div dir="rtl">
              <h2>لديك طلب جديد</h2>
              <p>رقم الطلب: #${order.order_number}</p>
              <p>العميل: ${order.contractor.full_name}</p>
              <p>المبلغ: ${validatedData.amount.toFixed(2)} ${validatedData.currency}</p>
              <p>يرجى تجهيز الطلب للتوصيل.</p>
            </div>
          `,
          data: {
            orderId: validatedData.orderId,
            orderNumber: order.order_number,
            amount: validatedData.amount
          }
        } as any)
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError)
      // Don't fail the payment if notifications fail
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      orderStatus: 'confirmed',
      escrowReleaseDate: calculateEscrowReleaseDate()
    })

  } catch (error: any) {
    console.error('Payment processing error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'فشلت عملية الدفع' },
      { status: 500 }
    )
  }
}

// Helper function to detect card brand
function detectCardBrand(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '')

  if (cleanNumber.startsWith('4')) return 'Visa'
  if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'Mastercard'
  if (cleanNumber.startsWith('3')) return 'Amex'

  return 'Unknown'
}

// Helper function to calculate escrow release date
function calculateEscrowReleaseDate(): string {
  const releaseDate = new Date()
  releaseDate.setDate(releaseDate.getDate() + 3) // 3 days after delivery confirmation
  return releaseDate.toISOString()
}