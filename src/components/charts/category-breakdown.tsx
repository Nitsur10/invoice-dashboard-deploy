"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function CategoryBreakdown({
  data,
  isLoading,
}: {
  data: Array<{ category: string; count: number; amount: number }>
  isLoading?: boolean
}) {
  const categories = (data || []).map(c => ({
    name: c.category,
    amount: Math.round(c.amount || 0),
  }))

  return (
    <Card className="glass-card glass-card-hover border-2 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-3 drop-shadow-sm">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full shadow-md"></div>
          <span className="text-slate-800 dark:text-white tracking-tight">Category Breakdown</span>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ height: 300 }}>
        {isLoading ? (
          <div className="h-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
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
              <Bar dataKey="amount" fill="oklch(0.25 0.08 240)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
