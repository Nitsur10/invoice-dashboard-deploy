import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getSupabaseServerComponentClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth guard: require signed-in session for all dashboard pages
  try {
    const supabase = await getSupabaseServerComponentClient()
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        redirect('/auth/login')
      }
    } else {
      // Supabase not configured, redirect to login
      redirect('/auth/login')
    }
  } catch (error) {
    console.error('Dashboard auth error:', error)
    // If Supabase is not configured or an error occurs, treat as unauthenticated
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen relative z-10">
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg text-white"
        style={{
          backgroundColor: 'oklch(0.25 0.08 240)'
        }}
      >
        Skip to main content
      </a>
      
      {/* Sidebar Navigation */}
      <nav 
        role="navigation" 
        aria-label="Main navigation"
        className="fixed inset-y-0 z-50 flex w-72 flex-col"
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-sidebar">
          <Sidebar />
        </div>
      </nav>
      
      <div className="flex flex-col flex-1 pl-72">
        {/* Header */}
        <header 
          role="banner"
          className="sticky top-0 z-40 glass-header"
        >
          <Header />
        </header>
        
        {/* Main Content */}
        <main 
          id="main-content"
          role="main" 
          className="flex-1 p-6"
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
