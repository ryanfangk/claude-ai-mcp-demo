'use client'

// Recharts bar chart: products bucketed by price band. Indigo bars to give
// the dashboard two visually distinct accents (coral on time-series, indigo
// on categorical) without breaking the "one bold thing" brand rule —
// indigo is the secondary, so it's allowed alongside coral.

import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Bucket = { label: string; count: number }

type Props = {
  data: Bucket[]
  indigo: string
  mute: string
  hairline: string
}

export default function PriceHistogram({ data, indigo, mute, hairline }: Props) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={hairline} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: mute, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: hairline }}
          />
          <YAxis
            tick={{ fill: mute, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: '#f8f9fa' }}
            contentStyle={{
              background: '#ffffff',
              border: `1px solid ${hairline}`,
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              color: '#0b0d10',
            }}
            formatter={(value) => [`${value} products`, '']}
          />
          <Bar
            dataKey="count"
            fill={indigo}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
