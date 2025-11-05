'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

interface DeliverySuccessGaugeProps {
  successRate: number
  height?: number
}

export function DeliverySuccessGauge({ successRate, height = 250 }: DeliverySuccessGaugeProps) {
  const data = [
    {
      name: 'Success Rate',
      value: successRate,
      fill: successRate >= 90 ? '#10B981' : successRate >= 70 ? '#F59E0B' : '#EF4444',
    },
  ]

  return (
    <div className="w-full flex flex-col items-center" style={{ height }}>
      <ResponsiveContainer width="100%" height="80%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          barSize={20}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
            fill={data[0].fill}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <div className="text-4xl font-bold" style={{ color: data[0].fill }}>
          {successRate}%
        </div>
        <div className="text-sm text-gray-600 mt-1">معدل نجاح التوصيل</div>
      </div>
    </div>
  )
}
