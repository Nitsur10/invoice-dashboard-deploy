import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login | RPD Invoice Dashboard',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      {children}
    </div>
  )
}
