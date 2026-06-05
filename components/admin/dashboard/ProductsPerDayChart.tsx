'use client'

// Recharts area chart: products created per day across the last 30 days.
// Client component — Recharts uses refs + ResizeObserver, can't render under
// React Server Components. Server hands plain { day, count } arrays in;
// nothing here touches Payload.
//
// Sister chart to RevenuePerDayChart — same area-chart treatment but indigo
// instead of coral, so the two stacked charts on the dashboard read as
// "primary metric (revenue, coral)" and "secondary metric (activity, indigo)".

import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { day: string; count: number }

type Props = {
  data: Point[]
  indigo: string
  mute: string
  hairline: string
}

function shortDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ProductsPerDayChart({ data, indigo, mute, hairline }: Props) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="productsIndigoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={indigo} stopOpacity={0.3} />
              <stop offset="100%" stopColor={indigo} stopOpacity={0} />
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
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null
              const value = Number(payload[0]?.value ?? 0)
              return (
                <div
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${hairline}`,
                    borderRadius: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    color: '#0b0d10',
                    lineHeight: 1.3,
                  }}
                >
                  <div style={{ color: mute, fontSize: '0.75rem' }}>
                    {shortDay(String(label))}
                  </div>
                  <div style={{ color: indigo, fontWeight: 500, marginTop: '0.15rem' }}>
                    {value} {value === 1 ? 'product' : 'products'}
                  </div>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={indigo}
            strokeWidth={2}
            fill="url(#productsIndigoFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
