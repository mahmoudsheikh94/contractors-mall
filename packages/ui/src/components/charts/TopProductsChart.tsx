'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TopProductData {
  productId: string
  name_ar: string
  name_en: string
  revenue: number
  quantity: number
  orders: number
}

interface TopProductsChartProps {
  data: TopProductData[]
  height?: number
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export function TopProductsChart({ data, height = 300 }: TopProductsChartProps) {
  // Truncate long product names
  const formattedData = data.map((item, index) => ({
    ...item,
    displayName: item.name_ar.length > 20
      ? item.name_ar.substring(0, 20) + '...'
      : item.name_ar,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'د.أ', position: 'insideRight', offset: -10 }}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            stroke="#6B7280"
            style={{ fontSize: '12px', direction: 'rtl' }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              direction: 'rtl',
            }}
            formatter={(value: number) => [`${value.toFixed(2)} د.أ`, 'الإيرادات']}
            labelFormatter={(label: string, payload) => {
              if (payload && payload[0]) {
                const data = payload[0].payload as TopProductData
                return (
                  <div className="font-bold">
                    {data.name_ar}
                    <div className="text-xs text-gray-600 font-normal mt-1">
                      الكمية: {data.quantity} | الطلبات: {data.orders}
                    </div>
                  </div>
                )
              }
              return label
            }}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
