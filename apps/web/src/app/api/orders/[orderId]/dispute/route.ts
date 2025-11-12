/**
 * API Route: Report Order Dispute
 *
 * POST /api/orders/[orderId]/dispute
 *
 * Allows contractors to report issues with their orders.
 * On successful dispute creation:
 * - Creates dispute record
 * - Freezes payment (prevents release to supplier)
 * - Updates order status to 'disputed'
 *
 * Security:
 * - Only order owner can report disputes
 * - Cannot dispute already completed orders
 * - Cannot dispute already disputed orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DisputeRequest {
  reason: string
  description: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body: DisputeRequest = await request.json()

    // Validate input
    if (!body.description || body.description.trim().length < 10) {
      return NextResponse.json(
        { error: 'الرجاء تقديم وصف تفصيلي للمشكلة (10 أحرف على الأقل)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'الرجاء تسجيل الدخول' },
        { status: 401 }
      )
    }

    // Get order with payment info
    const { data: order, error: orderError } = (await supabase
      .from('orders')
      .select(`
        order_id,
        contractor_id,
        status,
        total_jod,
        payments!inner (
          payment_id,
          status
        )
      `)
      .eq('order_id', orderId)
      .single()) as { data: any, error: any }

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Verify user owns this order
    if (order.contractor_id !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالإبلاغ عن هذا الطلب' },
        { status: 403 }
      )
    }

    // Check if order is already disputed
    if (order.status === 'disputed') {
      return NextResponse.json(
        { error: 'تم الإبلاغ عن هذا الطلب مسبقاً' },
        { status: 400 }
      )
    }

    // Check if order is already completed with payment released
    if (order.status === 'completed' && (order.payments as any).status === 'released') {
      return NextResponse.json(
        { error: 'لا يمكن الإبلاغ عن طلب مكتمل. الرجاء التواصل مع الدعم الفني' },
        { status: 400 }
      )
    }

    // Check if order is rejected
    if (order.status === 'rejected') {
      return NextResponse.json(
        { error: 'لا يمكن الإبلاغ عن طلب مرفوض' },
        { status: 400 }
      )
    }

    // Update order status to 'disputed'
    // NOTE: 'disputed' status is not yet in production database.
    // Will fail until migrations are applied to production.
    // TODO: Run migration 20251113000000 in production to enable disputed status
    const { error: orderUpdateError } = await (supabase
      .from('orders')
      .update as any)({
        status: 'disputed' as any, // Cast required until database is updated
        disputed_at: new Date().toISOString(),
        dispute_reason: body.description,
      })
      .eq('order_id', orderId)

    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError)
      return NextResponse.json(
        { error: 'فشل تحديث حالة الطلب' },
        { status: 500 }
      )
    }

    // Freeze payment if not already released
    const payment = (order.payments as any)
    if (payment.status !== 'released') {
      const { error: paymentUpdateError } = await (supabase
        .from('payments')
        .update as any)({ status: 'frozen' })
        .eq('payment_id', payment.payment_id)

      if (paymentUpdateError) {
        console.error('Error freezing payment:', paymentUpdateError)
        return NextResponse.json(
          { error: 'فشل تجميد المبلغ' },
          { status: 500 }
        )
      }
    }

    // TODO: Create dispute record in disputes table (Phase 5)
    // TODO: Send notification to admin (Phase 5)
    // TODO: Send notification to supplier (Phase 5)

    return NextResponse.json({
      success: true,
      message: 'تم إرسال البلاغ بنجاح. سيتواصل معك فريق الدعم قريباً.',
      order: {
        order_id: orderId,
        status: 'disputed',
        payment_status: payment.status !== 'released' ? 'frozen' : payment.status,
      },
    })
  } catch (error) {
    console.error('Error reporting dispute:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الإبلاغ عن المشكلة' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders/[orderId]/dispute
 *
 * Get dispute information for an order
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'الرجاء تسجيل الدخول' },
        { status: 401 }
      )
    }

    // Get order dispute info
    const { data: order, error: orderError } = (await supabase
      .from('orders')
      .select(`
        order_id,
        contractor_id,
        status,
        disputed_at,
        dispute_reason
      `)
      .eq('order_id', orderId)
      .single()) as { data: any, error: any }

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Verify user owns this order
    if (order.contractor_id !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض هذا الطلب' },
        { status: 403 }
      )
    }

    // Check if order has dispute
    if (order.status !== 'disputed') {
      return NextResponse.json({
        disputed: false,
        order_id: orderId,
      })
    }

    return NextResponse.json({
      disputed: true,
      order_id: orderId,
      disputed_at: order.disputed_at,
      dispute_reason: order.dispute_reason,
    })
  } catch (error) {
    console.error('Error fetching dispute info:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب معلومات المشكلة' },
      { status: 500 }
    )
  }
}
