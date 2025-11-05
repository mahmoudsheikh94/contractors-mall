import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/analytics
 *
 * Returns comprehensive analytics data for the supplier dashboard:
 * - 30-day sales trend
 * - Top 5 products by revenue
 * - Average order value
 * - Delivery success rate
 * - Contractor insights (repeat customers, lifetime value)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get supplier ID for current user
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const supplierId = supplier.id

    // Calculate date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all orders for this supplier in the last 30 days
    const { data: orders } = (await supabase
      .from('orders')
      .select(`
        order_id,
        order_number,
        total_jod,
        status,
        created_at,
        contractor_id,
        payments!inner (
          payment_id,
          amount_jod,
          status
        ),
        deliveries (
          delivery_id,
          status
        ),
        order_items (
          product_id,
          quantity,
          price_per_unit,
          subtotal_jod,
          products (
            name_ar,
            name_en
          )
        )
      `)
      .eq('supplier_id', supplierId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })) as { data: any[] | null }

    const ordersList = orders || []

    // 1. Calculate 30-day sales trend (daily revenue)
    const salesByDay: Record<string, number> = {}
    const ordersByDay: Record<string, number> = {}

    ordersList.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      salesByDay[date] = (salesByDay[date] || 0) + order.total_jod
      ordersByDay[date] = (ordersByDay[date] || 0) + 1
    })

    const salesTrend = Object.entries(salesByDay)
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
        orders: ordersByDay[date] || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 2. Calculate top 5 products by revenue
    const productRevenue: Record<string, {
      productId: string
      name_ar: string
      name_en: string
      revenue: number
      quantity: number
      orders: number
    }> = {}

    ordersList.forEach((order) => {
      order.order_items?.forEach((item: any) => {
        const productId = item.product_id
        if (!productRevenue[productId]) {
          productRevenue[productId] = {
            productId,
            name_ar: item.products?.name_ar || 'Unknown',
            name_en: item.products?.name_en || 'Unknown',
            revenue: 0,
            quantity: 0,
            orders: 0,
          }
        }
        productRevenue[productId].revenue += item.subtotal_jod
        productRevenue[productId].quantity += item.quantity
        productRevenue[productId].orders += 1
      })
    })

    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }))

    // 3. Calculate average order value
    const totalRevenue = ordersList.reduce((sum, order) => sum + order.total_jod, 0)
    const avgOrderValue = ordersList.length > 0
      ? Math.round((totalRevenue / ordersList.length) * 100) / 100
      : 0

    // 4. Calculate delivery success rate
    const completedDeliveries = ordersList.filter(
      (order) => order.status === 'completed' || order.status === 'delivered'
    ).length
    const totalDeliveries = ordersList.filter(
      (order) => order.status !== 'rejected' && order.status !== 'confirmed'
    ).length
    const deliverySuccessRate = totalDeliveries > 0
      ? Math.round((completedDeliveries / totalDeliveries) * 100)
      : 0

    // 5. Contractor insights
    const contractorOrders: Record<string, number> = {}
    const contractorRevenue: Record<string, number> = {}

    ordersList.forEach((order) => {
      const contractorId = order.contractor_id
      contractorOrders[contractorId] = (contractorOrders[contractorId] || 0) + 1
      contractorRevenue[contractorId] = (contractorRevenue[contractorId] || 0) + order.total_jod
    })

    const uniqueContractors = Object.keys(contractorOrders).length
    const repeatContractors = Object.values(contractorOrders).filter((count) => count > 1).length
    const avgCustomerLifetimeValue = uniqueContractors > 0
      ? Math.round((totalRevenue / uniqueContractors) * 100) / 100
      : 0

    // 6. Peak ordering times (hour of day analysis)
    const ordersByHour: Record<number, number> = {}

    ordersList.forEach((order) => {
      const hour = new Date(order.created_at).getHours()
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
    })

    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orders: ordersByHour[hour] || 0,
    }))

    // Calculate revenue projections (simple linear projection based on last 7 days)
    const last7Days = salesTrend.slice(-7)
    const avgDailyRevenueLast7Days = last7Days.length > 0
      ? last7Days.reduce((sum, day) => sum + day.revenue, 0) / last7Days.length
      : 0
    const projectedMonthlyRevenue = Math.round(avgDailyRevenueLast7Days * 30 * 100) / 100

    return NextResponse.json({
      salesTrend,
      topProducts,
      avgOrderValue,
      deliverySuccessRate,
      contractorInsights: {
        totalContractors: uniqueContractors,
        repeatContractors,
        repeatRate: uniqueContractors > 0
          ? Math.round((repeatContractors / uniqueContractors) * 100)
          : 0,
        avgLifetimeValue: avgCustomerLifetimeValue,
      },
      peakHours,
      projections: {
        monthlyRevenue: projectedMonthlyRevenue,
        basedOnLast7Days: true,
      },
      summary: {
        totalOrders: ordersList.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        period: {
          start: thirtyDaysAgo.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
        },
      },
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
