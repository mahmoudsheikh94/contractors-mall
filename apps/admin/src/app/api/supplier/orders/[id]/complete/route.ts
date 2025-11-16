/**
 * POST /api/supplier/orders/[id]/complete
 * ========================================
 *
 * Manually mark an order as completed
 * Only allowed for suppliers on their own delivered orders with released payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus } from '@/lib/services/orderStatus'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: orderId } = await params

    // 1. Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح (Unauthorized)' },
        { status: 401 }
      )
    }

    // 2. Get supplier ID
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'حساب مورد غير موجود (Supplier account not found)' },
        { status: 403 }
      )
    }

    // 3. Get order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, supplier_id')
      .eq('id', orderId)
      .eq('supplier_id', supplier.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود أو غير مصرح (Order not found or unauthorized)' },
        { status: 404 }
      )
    }

    // 4. Verify order is in 'delivered' status
    if (order.status !== 'delivered') {
      return NextResponse.json(
        {
          error: `لا يمكن إكمال الطلب. الحالة الحالية: ${order.status}`,
          error_en: `Cannot complete order. Current status: ${order.status}`,
          current_status: order.status,
        },
        { status: 400 }
      )
    }

    // 5. Verify payment has been released
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, status, released_at')
      .eq('order_id', orderId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'معلومات الدفع غير موجودة (Payment information not found)' },
        { status: 400 }
      )
    }

    if (payment.status !== 'released') {
      return NextResponse.json(
        {
          error: 'يجب أن يتم تحرير الدفعة أولاً قبل إكمال الطلب',
          error_en: 'Payment must be released before completing the order',
          payment_status: payment.status,
        },
        { status: 400 }
      )
    }

    // 6. Update order status to completed using centralized helper (sends email)
    const now = new Date().toISOString()
    const statusUpdate = await updateOrderStatus(supabase, orderId, 'completed')

    if (!statusUpdate.success) {
      console.error('Error updating order to completed:', statusUpdate.error)
      return NextResponse.json(
        {
          error: 'فشل تحديث حالة الطلب',
          error_en: 'Failed to update order status',
          details: statusUpdate.error,
        },
        { status: 500 }
      )
    }

    // 7. Log activity
    await supabase
      .from('order_activities')
      .insert({
        order_id: orderId,
        activity_type: 'order_completed_manually',
        description: 'Supplier manually marked order as completed',
        metadata: {
          completed_at: now,
          completed_by: user.id,
          payment_status: payment.status,
          payment_released_at: payment.released_at,
        },
        created_by: user.id,
      })

    console.log('✅ Order manually completed:', {
      orderId,
      orderNumber: order.order_number,
      supplierId: supplier.id,
      completedBy: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'تم إكمال الطلب بنجاح!',
      message_en: 'Order completed successfully!',
      data: {
        order_id: orderId,
        order_number: order.order_number,
        status: 'completed',
        completed_at: now,
      },
    })

  } catch (error: any) {
    console.error('Error completing order:', error)
    return NextResponse.json(
      {
        error: 'حدث خطأ أثناء إكمال الطلب',
        error_en: 'An error occurred while completing the order',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
