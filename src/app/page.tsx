'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { analytics, trackLandingPageView } from '@/lib/analytics'
import { LandingHero } from '@/components/landing/landing-hero'
import ErrorBoundary from '@/components/error-boundary'

// Dynamic imports for better performance
const LandingFeatures = dynamic(() => import('@/components/landing/landing-features').then((m) => ({ default: m.LandingFeatures })), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
})

const LandingTestimonials = dynamic(() => import('@/components/landing/landing-testimonials').then((m) => ({ default: m.LandingTestimonials })), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
})

const LandingFooter = dynamic(() => import('@/components/landing/landing-footer').then((m) => ({ default: m.LandingFooter })), {
  ssr: false,
  loading: () => <div className="h-32 bg-slate-800 animate-pulse" />
})

function LandingPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20 flex items-center justify-center">
      <div className="text-center max-w-4xl mx-auto px-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-4">
            Invoice Manager Pro
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-8">
            Professional Dashboard for Real Estate
          </p>
        </div>

        <div className="space-y-4 text-lg text-slate-700">
          <p>🚀 Advanced invoice management system</p>
          <p>📊 Real-time analytics and reporting</p>
          <p>🔄 Seamless workflow integration</p>
          <p>💼 Built for real estate professionals</p>
        </div>

        <div className="mt-12">
          <button
            onClick={() => window.location.href = '/overview'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            Access Dashboard
          </button>
        </div>

        <div className="mt-16 text-sm text-slate-500">
          <p>⚠️ Landing page components are loading...</p>
          <p className="mt-2">If this persists, try refreshing the page</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // Show fallback if we're in a development environment without proper setup
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <LandingPageFallback />
  }

  useEffect(() => {
    // Initialize analytics
    try {
      analytics.init()
      trackLandingPageView()
    } catch (error) {
      console.warn('Analytics initialization failed:', error)
    }

    const checkUser = async () => {
      try {
        // Only check auth if supabase is properly configured
        if (supabase && typeof supabase.auth?.getSession === 'function') {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            router.replace('/overview')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // Continue showing landing page if auth check fails
        // This ensures landing page always shows for unauthenticated users
      }
    }

    // Small delay to ensure page loads first
    const timer = setTimeout(checkUser, 100)
    return () => clearTimeout(timer)
  }, [router, supabase])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20">
        <ErrorBoundary>
          <LandingHero />
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div className="h-96 bg-slate-100 animate-pulse rounded-xl mx-8" />}>
            <LandingFeatures />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div className="h-96 bg-slate-100 animate-pulse rounded-xl mx-8" />}>
            <LandingTestimonials />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div className="h-32 bg-slate-800 animate-pulse" />}>
            <LandingFooter />
          </Suspense>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}