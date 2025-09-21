"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function CategoryBreakdown({
  data,
  isLoading,
}: {
  data: Array<{ supplier: string; count: number; amount: number }>
  isLoading?: boolean
}) {
  const suppliers = (data || []).slice(0, 8).map(s => ({
    name: s.supplier,
    amount: Math.round(s.amount || 0),
  }))

  return (
    <Card className="glass-card glass-card-hover border-2 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center space-x-3">
          <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
          <span className="text-gray-900">Supplier Breakdown</span>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ height: 350 }}>
        {isLoading ? (
          <div className="h-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={suppliers}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#374151' }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tickFormatter={(value) => {
                  // Smart truncation for supplier names
                  if (value.length > 15) {
                    return value.substring(0, 13) + '...'
                  }
                  return value
                }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#374151' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Amount']}
                labelFormatter={(label) => `Supplier: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="amount" fill="oklch(0.25 0.08 240)" radius={4} maxBarSize={80} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
