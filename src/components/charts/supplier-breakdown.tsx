"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function StatusBreakdown({
  data,
  isLoading,
}: {
  data: Array<{ status: string; count: number; amount: number }>
  isLoading?: boolean
}) {
  const statuses = (data || []).map(s => ({
    name: s.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: s.count,
    amount: Math.round(s.amount || 0),
  }))

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'oklch(0.7 0.2 60)', // amber
      'in_review': 'oklch(0.6 0.2 270)', // blue
      'approved': 'oklch(0.6 0.2 140)', // purple
      'paid': 'oklch(0.6 0.2 120)', // green
      'overdue': 'oklch(0.6 0.2 0)', // red
    }
    return colorMap[status.toLowerCase()] || 'oklch(0.25 0.08 240)'
  }

  return (
    <Card className="glass-card glass-card-hover border-2 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center space-x-3">
          <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
          <span className="text-gray-900">Status Breakdown</span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Distribution of invoices by processing status
        </p>
      </CardHeader>
      <CardContent style={{ height: 350 }}>
        {isLoading ? (
          <div className="h-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statuses} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#374151' }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#374151' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: any, name: any, props: any) => {
                  const status = props.payload?.status || 'unknown'
                  const count = props.payload?.count || 0
                  return [
                    `$${Number(v).toLocaleString()}`,
                    'Amount',
                    `Count: ${count} invoices`,
                    `Status: ${status}`
                  ]
                }}
                labelFormatter={(label) => `Status: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
              <Bar
                dataKey="amount"
                radius={4}
                maxBarSize={80}
              >
                {statuses.map((entry, index) => (
                  <Bar
                    key={`bar-${index}`}
                    fill={getStatusColor(entry.name.toLowerCase().replace(' ', '_'))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
