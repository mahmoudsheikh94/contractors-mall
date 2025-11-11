import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

/**
 * POST /api/admin/orders/bulk-update
 *
 * Bulk update multiple orders
 * Supports updating status, payment_status, and adding internal notes
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { orderIds, updates } = body

    // Validate input
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      )
    }

    // Allowed update fields
    const allowedFields = ['status', 'payment_status']
    const updateData: any = {}

    // Validate and prepare update data
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) {
        return NextResponse.json(
          { error: `Field '${key}' is not allowed for bulk update` },
          { status: 400 }
        )
      }

      // Validate status values
      if (key === 'status') {
        const validStatuses = ['confirmed', 'accepted', 'in_delivery', 'delivered', 'completed', 'rejected', 'disputed', 'cancelled']
        if (!validStatuses.includes(value as string)) {
          return NextResponse.json(
            { error: `Invalid status value: ${value}` },
            { status: 400 }
          )
        }
      }

      if (key === 'payment_status') {
        const validPaymentStatuses = ['pending', 'escrow_held', 'released', 'refunded']
        if (!validPaymentStatuses.includes(value as string)) {
          return NextResponse.json(
            { error: `Invalid payment_status value: ${value}` },
            { status: 400 }
          )
        }
      }

      updateData[key] = value
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Execute bulk update in a transaction-like manner
    const results = []
    const errors = []

    for (const orderId of orderIds) {
      try {
        // Update the order
        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId)

        if (updateError) {
          errors.push({
            orderId,
            error: updateError.message
          })
          continue
        }

        // Log the action in admin_audit_log
        const { error: auditError } = (await supabase
          .from('admin_audit_log' as any)
          .insert({
            admin_id: user.id,
            action: 'bulk_update_order',
            table_name: 'orders',
            record_id: orderId,
            changes: updateData,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          })) as any

        if (auditError) {
          console.error('Audit log error:', auditError)
          // Don't fail the operation if audit logging fails
        }

        results.push({
          orderId,
          success: true
        })
      } catch (err: any) {
        errors.push({
          orderId,
          error: err.message || 'Unknown error'
        })
      }
    }

    // Track the bulk operation
    trackEvent('Admin: Bulk Update Orders', {
      admin_id: user.id,
      admin_name: profile.full_name,
      order_count: orderIds.length,
      success_count: results.length,
      error_count: errors.length,
      updates: updateData
    }, 'info')

    // Return results
    const response = {
      success: true,
      summary: {
        total: orderIds.length,
        succeeded: results.length,
        failed: errors.length
      },
      results,
      errors: errors.length > 0 ? errors : undefined
    }

    return NextResponse.json(response, { status: errors.length > 0 ? 207 : 200 }) // 207 Multi-Status if partial success
  } catch (error: any) {
    console.error('Bulk update orders error:', error)
    trackAPIError(
      error,
      '/api/admin/orders/bulk-update',
      'POST',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to bulk update orders' },
      { status: 500 }
    )
  }
}
