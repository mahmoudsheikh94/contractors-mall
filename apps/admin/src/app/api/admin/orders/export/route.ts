import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { trackAPIError } from '@/lib/monitoring'

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders/export
 *
 * Exports orders to Excel format with comprehensive data
 * Admin only - exports all orders with filters
 */
export async function GET(request: NextRequest) {
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
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const supplierId = url.searchParams.get('supplierId')
    const contractorId = url.searchParams.get('contractorId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const minAmount = url.searchParams.get('minAmount')
    const maxAmount = url.searchParams.get('maxAmount')

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
        delivery_phone,
        special_requests,
        vehicle_type,
        payment_status,
        contractor:contractor_id (
          full_name,
          phone,
          email
        ),
        supplier:supplier_id (
          business_name,
          business_name_en,
          phone
        ),
        order_items (
          quantity,
          unit_price_jod,
          subtotal_jod,
          product:product_id (
            name_ar,
            name_en,
            sku
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    if (contractorId) {
      query = query.eq('contractor_id', contractorId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (minAmount) {
      query = query.gte('total_jod', parseFloat(minAmount))
    }

    if (maxAmount) {
      query = query.lte('total_jod', parseFloat(maxAmount))
    }

    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      trackAPIError(
        new Error(ordersError.message),
        '/api/admin/orders/export',
        'GET',
        500,
        { filters: { status, supplierId, contractorId, startDate, endDate } }
      )
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Contractors Mall Admin'
    workbook.created = new Date()

    // Create orders sheet
    const ordersSheet = workbook.addWorksheet('Orders', {
      views: [{ rightToLeft: true }], // RTL for Arabic
      properties: { defaultRowHeight: 20 }
    })

    // Define columns
    ordersSheet.columns = [
      { header: 'رقم الطلب', key: 'order_number', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'حالة الدفع', key: 'payment_status', width: 15 },
      { header: 'المورد', key: 'supplier', width: 25 },
      { header: 'العميل', key: 'contractor', width: 25 },
      { header: 'هاتف العميل', key: 'contractor_phone', width: 15 },
      { header: 'بريد العميل', key: 'contractor_email', width: 25 },
      { header: 'المجموع الكلي (د.أ)', key: 'total_jod', width: 18 },
      { header: 'رسوم التوصيل (د.أ)', key: 'delivery_fee_jod', width: 18 },
      { header: 'نوع المركبة', key: 'vehicle_type', width: 20 },
      { header: 'تاريخ التوصيل', key: 'delivery_date', width: 15 },
      { header: 'وقت التوصيل', key: 'delivery_time_slot', width: 25 },
      { header: 'عنوان التوصيل', key: 'delivery_address', width: 40 },
      { header: 'هاتف التوصيل', key: 'delivery_phone', width: 15 },
      { header: 'ملاحظات خاصة', key: 'special_requests', width: 30 },
      { header: 'عدد المنتجات', key: 'items_count', width: 15 },
      { header: 'تاريخ الإنشاء', key: 'created_at', width: 20 },
    ]

    // Style header row
    const headerRow = ordersSheet.getRow(1)
    headerRow.font = { bold: true, size: 11 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4B5563' }
    }
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    // Status labels
    const statusLabels: Record<string, string> = {
      confirmed: 'جديد - معلق',
      accepted: 'مقبول',
      in_delivery: 'قيد التوصيل',
      delivered: 'تم التوصيل',
      completed: 'مكتمل',
      rejected: 'مرفوض',
      disputed: 'متنازع عليه',
      cancelled: 'ملغي'
    }

    const paymentStatusLabels: Record<string, string> = {
      pending: 'معلق',
      escrow_held: 'محتجز',
      released: 'محرر',
      refunded: 'مسترد'
    }

    const timeSlotLabels: Record<string, string> = {
      morning: 'صباحاً (8:00 - 12:00)',
      afternoon: 'ظهراً (12:00 - 4:00)',
      evening: 'مساءً (4:00 - 8:00)',
    }

    const vehicleLabels: Record<string, string> = {
      pickup_1t: 'وانيت 1 طن',
      truck_3_5t: 'شاحنة 3.5 طن',
      flatbed_5t: 'قلاب مسطح 5 طن'
    }

    // Add data rows
    orders?.forEach(order => {
      const contractor = Array.isArray(order.contractor) ? order.contractor[0] : order.contractor
      const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier
      const items = Array.isArray(order.order_items) ? order.order_items : []

      ordersSheet.addRow({
        order_number: order.order_number || '',
        status: statusLabels[order.status] || order.status,
        payment_status: paymentStatusLabels[order.payment_status] || order.payment_status,
        supplier: supplier?.business_name || '',
        contractor: contractor?.full_name || '',
        contractor_phone: contractor?.phone || '',
        contractor_email: contractor?.email || '',
        total_jod: order.total_jod || 0,
        delivery_fee_jod: order.delivery_fee_jod || 0,
        vehicle_type: vehicleLabels[order.vehicle_type] || order.vehicle_type,
        delivery_date: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('ar-JO') : '',
        delivery_time_slot: timeSlotLabels[order.delivery_time_slot] || order.delivery_time_slot,
        delivery_address: order.delivery_address || '',
        delivery_phone: order.delivery_phone || '',
        special_requests: order.special_requests || '',
        items_count: items.length,
        created_at: new Date(order.created_at).toLocaleString('ar-JO'),
      })
    })

    // Format number columns
    ordersSheet.getColumn('total_jod').numFmt = '#,##0.00'
    ordersSheet.getColumn('delivery_fee_jod').numFmt = '#,##0.00'

    // Add borders to all cells
    ordersSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        }
      })
    })

    // Create items detail sheet
    const itemsSheet = workbook.addWorksheet('Order Items', {
      views: [{ rightToLeft: true }],
      properties: { defaultRowHeight: 20 }
    })

    itemsSheet.columns = [
      { header: 'رقم الطلب', key: 'order_number', width: 15 },
      { header: 'كود المنتج', key: 'sku', width: 15 },
      { header: 'اسم المنتج', key: 'product_name', width: 30 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'سعر الوحدة (د.أ)', key: 'unit_price', width: 18 },
      { header: 'المجموع الفرعي (د.أ)', key: 'subtotal', width: 18 },
    ]

    // Style items header
    const itemsHeaderRow = itemsSheet.getRow(1)
    itemsHeaderRow.font = { bold: true, size: 11 }
    itemsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4B5563' }
    }
    itemsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    itemsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }

    // Add items data
    orders?.forEach(order => {
      const items = Array.isArray(order.order_items) ? order.order_items : []
      items.forEach(item => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product
        itemsSheet.addRow({
          order_number: order.order_number || '',
          sku: product?.sku || '',
          product_name: product?.name_ar || '',
          quantity: item.quantity || 0,
          unit_price: item.unit_price_jod || 0,
          subtotal: item.subtotal_jod || 0,
        })
      })
    })

    // Format items number columns
    itemsSheet.getColumn('unit_price').numFmt = '#,##0.00'
    itemsSheet.getColumn('subtotal').numFmt = '#,##0.00'

    // Add borders to items sheet
    itemsSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        }
      })
    })

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer()

    // Return as downloadable file
    const filename = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Export orders error:', error)
    trackAPIError(
      error,
      '/api/admin/orders/export',
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to export orders' },
      { status: 500 }
    )
  }
}
