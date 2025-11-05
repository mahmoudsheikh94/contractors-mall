'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface PeakHourData {
  hour: number
  orders: number
}

interface PeakHoursChartProps {
  data: PeakHourData[]
  height?: number
}

export function PeakHoursChart({ data, height = 200 }: PeakHoursChartProps) {
  // Format hours for display (e.g., "8 ص" for 8 AM, "14 م" for 2 PM)
  const formattedData = data.map((item) => ({
    ...item,
    displayHour: item.hour === 0
      ? '12 ص'
      : item.hour < 12
      ? `${item.hour} ص`
      : item.hour === 12
      ? '12 م'
      : `${item.hour - 12} م`,
  }))

  // Calculate max orders for color scaling
  const maxOrders = Math.max(...data.map((d) => d.orders))

  // Function to get color based on order count
  const getColor = (orders: number) => {
    if (orders === 0) return '#F3F4F6'
    const intensity = orders / maxOrders
    if (intensity > 0.7) return '#10B981' // High activity - green
    if (intensity > 0.4) return '#3B82F6' // Medium activity - blue
    return '#F59E0B' // Low activity - amber
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="displayHour"
            stroke="#6B7280"
            style={{ fontSize: '10px' }}
            interval={1}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'طلبات', angle: 0, position: 'top', offset: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              direction: 'rtl',
            }}
            formatter={(value: number) => [value, 'عدد الطلبات']}
            labelFormatter={(label: string, payload) => {
              if (payload && payload[0]) {
                const hour = payload[0].payload.hour
                return `الساعة ${label}`
              }
              return label
            }}
          />
          <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.orders)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
