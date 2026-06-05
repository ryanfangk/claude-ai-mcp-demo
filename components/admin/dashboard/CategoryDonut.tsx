'use client'

// Recharts donut: products by category. Client component for the same reason
// as the line chart — Recharts is browser-only. Receives pre-bucketed
// { category, label, count } rows.

import React from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type Slice = { category: string; label: string; count: number }

type Props = {
  data: Slice[]
  palette: string[]
  mute: string
}

export default function CategoryDonut({ data, palette, mute }: Props) {
  const total = data.reduce((a, s) => a + s.count, 0)
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            isAnimationActive={false}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((s, i) => (
              <Cell key={s.category} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              color: '#0b0d10',
            }}
            formatter={(value, name) => [
              `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: '0.8rem', color: mute }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
