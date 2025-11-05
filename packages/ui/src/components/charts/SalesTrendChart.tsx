'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface SalesTrendData {
  date: string
  revenue: number
  orders: number
}

interface SalesTrendChartProps {
  data: SalesTrendData[]
  height?: number
}

export function SalesTrendChart({ data, height = 300 }: SalesTrendChartProps) {
  // Format date for display (show only day/month)
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('ar-JO', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="displayDate"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'د.أ', angle: 0, position: 'top', offset: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              direction: 'rtl',
            }}
            formatter={(value: number, name: string) => [
              name === 'revenue' ? `${value.toFixed(2)} د.أ` : value,
              name === 'revenue' ? 'الإيرادات' : 'الطلبات',
            ]}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px', direction: 'rtl' }}
            formatter={(value) => (value === 'revenue' ? 'الإيرادات (د.أ)' : 'عدد الطلبات')}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
