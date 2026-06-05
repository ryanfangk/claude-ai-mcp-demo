'use client'

// Recharts area chart: products created per day across the last 30 days.
// Client component — Recharts uses refs + ResizeObserver, can't render under
// React Server Components. Server hands plain { day, count } arrays in;
// nothing here touches Payload.

import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { day: string; count: number }

type Props = {
  data: Point[]
  coral: string
  mute: string
  hairline: string
}

function shortDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ProductsPerDayChart({ data, coral, mute, hairline }: Props) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="coralFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={coral} stopOpacity={0.35} />
              <stop offset="100%" stopColor={coral} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={hairline} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: mute, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: hairline }}
            tickFormatter={shortDay}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: mute, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: hairline }}
            contentStyle={{
              background: '#ffffff',
              border: `1px solid ${hairline}`,
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              color: '#0b0d10',
            }}
            labelFormatter={(value) => shortDay(String(value))}
            formatter={(value) => [`${value} products`, '']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={coral}
            strokeWidth={2}
            fill="url(#coralFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
