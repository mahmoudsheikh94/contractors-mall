import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

/**
 * GET /api/supplier/orders/export
 *
 * Exports orders to CSV format
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, business_name')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        order_number,
        status,
        created_at,
        delivery_date,
        delivery_time_slot,
        total_jod,
        delivery_fee_jod,
        delivery_address,
        contractor:contractor_id (
          full_name,
          phone,
          email
        )
      `)
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status as any)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      console.error('Orders fetch error:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Generate CSV
    const statusLabels: Record<string, string> = {
      pending: 'معلق',
      confirmed: 'تم تأكيد الطلب',
      in_delivery: 'قيد التوصيل',
      delivered: 'تم التوصيل',
      completed: 'مكتمل',
      rejected: 'مرفوض',
      disputed: 'متنازع عليه',
      cancelled: 'ملغي',
      awaiting_contractor_confirmation: 'في انتظار التأكيد',
    }

    const timeSlotLabels: Record<string, string> = {
      morning: 'صباحاً (8:00 - 12:00)',
      afternoon: 'ظهراً (12:00 - 4:00)',
      evening: 'مساءً (4:00 - 8:00)',
    }

    const headers = [
      'رقم الطلب',
      'الحالة',
      'العميل',
      'هاتف العميل',
      'بريد العميل',
      'المجموع الكلي (د.أ)',
      'رسوم التوصيل (د.أ)',
      'تاريخ التوصيل',
      'وقت التوصيل',
      'عنوان التوصيل',
      'تاريخ الإنشاء',
    ]

    const rows = orders?.map(order => {
      const contractor = Array.isArray(order.contractor) ? order.contractor[0] : order.contractor
      return [
        order.order_number || '',
        statusLabels[order.status] || order.status,
        contractor?.full_name || '',
        contractor?.phone || '',
        contractor?.email || '',
        order.total_jod?.toFixed(2) || '0.00',
        order.delivery_fee_jod?.toFixed(2) || '0.00',
        new Date(order.delivery_date).toLocaleDateString('ar-JO'),
        timeSlotLabels[order.delivery_time_slot] || order.delivery_time_slot,
        order.delivery_address || '',
        new Date(order.created_at).toLocaleString('ar-JO'),
      ]
    }) || []

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    // Add BOM for Excel UTF-8 support (Arabic characters)
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // Return as downloadable file
    const filename = `orders_${supplier.business_name}_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error: any) {
    console.error('Export orders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export orders' },
      { status: 500 }
    )
  }
}
