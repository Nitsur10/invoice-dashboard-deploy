"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function TopVendors({
  data,
  isLoading,
}: {
  data: Array<{ vendor: string; count: number; amount: number }>
  isLoading?: boolean
}) {
  const vendors = (data || []).slice(0, 8).map(v => ({
    name: v.vendor,
    amount: Math.round(v.amount || 0),
  }))

  return (
    <Card className="glass-card glass-card-hover border-2 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center space-x-3">
          <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
          <span className="text-gray-900">Top Vendors</span>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ height: 350 }}>
        {isLoading ? (
          <div className="h-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendors}>
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
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Amount']} 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="amount" fill="oklch(0.65 0.12 80)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
