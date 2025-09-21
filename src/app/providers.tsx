'use client'

import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <QueryProvider>
        {children}
      </QueryProvider>
    </ThemeProvider>
  )
}