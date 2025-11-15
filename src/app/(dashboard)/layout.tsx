import { ResponsiveSidebar } from '@/components/layout/responsive-sidebar'
import { Header } from '@/components/layout/header'
import { ChatWidget } from '@/components/chat/chat-widget'
import { getSupabaseServerComponentClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

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
      // Supabase not configured - allow access for development
      console.log('⚠️ Supabase not configured - allowing access for development')
    }
  } catch (error) {
    console.error('Dashboard auth error:', error)
    // If Supabase is not configured or an error occurs, allow access for development
    console.log('⚠️ Supabase error - allowing access for development')
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
      
      {/* Responsive Sidebar Navigation */}
      <ResponsiveSidebar />

      <div className="flex flex-col flex-1 pl-0 md:pl-72">
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
          className="flex-1 p-4 md:p-6"
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Chat Assistant Widget */}
      <ChatWidget />
    </div>
  )
}
